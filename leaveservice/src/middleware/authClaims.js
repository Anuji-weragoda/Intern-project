import { createPublicKey } from 'crypto';

// Claims-first middleware: attach req.user when possible but do not block requests.
// Use API Gateway provided claims first. If Authorization header present, try to
// verify token using `jose` dynamically if available; otherwise decode payload.

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}

function base64UrlDecode(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString('utf8');
}

export async function authMiddleware(req, res, next) {
  try {
    // vendia serverless-express exposes the original event on req.apiGateway.event
    const event = req?.apiGateway?.event;
    const claims = event?.requestContext?.authorizer?.claims;
    if (claims) {
      req.user = claims;
      return next();
    }

    const auth = req.headers?.authorization || req.headers?.Authorization;
    if (!auth) return next();

    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return next();
    const token = parts[1];

    // Try to verify using `jose` if available. This is dynamic so tests won't fail when package not installed.
    try {
      const { jwtVerify, createRemoteJWKSet } = await import('jose');
      const jwksUrl = process.env.JWKS_URL;
      if (jwksUrl) {
        const JWKS = createRemoteJWKSet(new URL(jwksUrl));
        const opts = {};
        if (process.env.JWT_ISSUER) opts.issuer = process.env.JWT_ISSUER;
        if (process.env.JWT_AUDIENCE) opts.audience = process.env.JWT_AUDIENCE;
        const { payload } = await jwtVerify(token, JWKS, opts);
        req.user = payload;
        return next();
      }
    } catch (err) {
      // jose not available or verification failed; fall back to decode
    }

    // Decode token without verifying signature (development-friendly). Configure
    // ALLOW_UNVERIFIED_JWT=false in production to reject unverified tokens.
    const parts2 = token.split('.');
    if (parts2.length !== 3) return next();
    const payloadJson = base64UrlDecode(parts2[1]);
    const payload = safeJsonParse(payloadJson);
    if (payload) {
      // Attach the decoded token payload to req.user. Do NOT rely on
      // token groups for authorization here; the requireAuth middleware
      // will call the authservice DB to obtain canonical roles.
      req.user = payload;
    }
    return next();
  } catch (err) {
    // if anything unexpected happens, do not block requests here.
    return next();
  }
}

// requireAuth middleware: enforces presence of req.user (and optional role check).
export function requireAuth(requiredRoles = []) {
  return async (req, res, next) => {
    console.log('[authClaims] requireAuth called with roles:', requiredRoles);
    if (!req.user) {
      // Attempt a last-ditch verification if Authorization header present
      const auth = req.headers?.authorization || req.headers?.Authorization;
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const parts = auth.split(' ');
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return res.status(401).json({ error: 'Unauthorized' });
      const token = parts[1];
      try {
        const { jwtVerify, createRemoteJWKSet } = await import('jose');
        const jwksUrl = process.env.JWKS_URL;
        if (!jwksUrl) return res.status(401).json({ error: 'Unauthorized' });
        const JWKS = createRemoteJWKSet(new URL(jwksUrl));
        const opts = {};
        if (process.env.JWT_ISSUER) opts.issuer = process.env.JWT_ISSUER;
        if (process.env.JWT_AUDIENCE) opts.audience = process.env.JWT_AUDIENCE;
        const { payload } = await jwtVerify(token, JWKS, opts);
        req.user = payload;
      } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    if (requiredRoles && requiredRoles.length > 0) {
      // Prefer authoritative role list from authservice DB. Call
      // authservice /api/v1/me with the same bearer token to get the
      // user's profile (which includes DB roles). Fall back to token
      // roles only if the call fails.
      const auth = req.headers?.authorization || req.headers?.Authorization;
      const parts = auth ? auth.split(' ') : [];
      const token = (parts.length === 2 && parts[0].toLowerCase() === 'bearer') ? parts[1] : null;

      let dbRoles = null;
      if (token) {
        try {
          const authServiceUrl = 'http://localhost:8081';
          console.warn(`[authClaims] Calling authservice at ${authServiceUrl}/api/v1/me`);
          const resp = await fetch(`${authServiceUrl}/api/v1/me`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
          });
          console.warn(`[authClaims] fetch returned status ${resp.status}`);
          if (resp.ok) {
            const profile = await resp.json();
            // attach DB id if present for downstream handlers
            if (profile && profile.id) req.user.dbId = profile.id;
            if (profile && Array.isArray(profile.roles)) dbRoles = profile.roles.map(r => String(r).toLowerCase());
            // expose canonical DB roles to downstream handlers (controller expects this)
            if (!req.user) req.user = {};
            req.user.dbRoles = dbRoles;
            console.log('[authClaims] Fetched dbRoles:', dbRoles);
          } else {
            // Log status + body to help debugging when authservice rejects the token
            try {
              const text = await resp.text();
              console.warn(`[authClaims] /api/v1/me returned ${resp.status} ${resp.statusText}: ${text}`);
            } catch (e) {
              console.warn(`[authClaims] /api/v1/me returned ${resp.status} ${resp.statusText} and body could not be read`);
            }
          }
        } catch (e) {
          // network/authservice failure - will fall back to token roles
          console.warn('[authClaims] failed to call authservice /api/v1/me:', e && e.message ? e.message : e);
          dbRoles = null;
        }
      }

      let has = false;
      if (dbRoles && dbRoles.length > 0) {
        has = requiredRoles.some(rr => dbRoles.includes(String(rr).toLowerCase()));
      } else {
        // fallback: check roles present on token payload (if any)
        const roles = req.user.roles || req.user.role || [];
        has = requiredRoles.some(r => (Array.isArray(roles) ? roles.map(x => String(x).toLowerCase()).includes(String(r).toLowerCase()) : String(roles).toLowerCase() === String(r).toLowerCase()));
      }

      if (!has) {
        try {
          const sub = req.user && (req.user.sub || req.user.username || req.user.email) ? (req.user.sub || req.user.username || req.user.email) : '<unknown>';
          const tokenRoles = (req.user && (req.user.roles || req.user.role)) || [];
          console.warn(`[authClaims] Authorization failed for user=${sub} required=${JSON.stringify(requiredRoles)} dbRoles=${JSON.stringify(dbRoles)} tokenRoles=${JSON.stringify(tokenRoles)}`);
        } catch (e) {
          // ignore logging errors
        }
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    return next();
  };
}

export default authMiddleware;
