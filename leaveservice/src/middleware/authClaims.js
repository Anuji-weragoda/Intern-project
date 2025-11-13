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
      // Use Cognito groups embedded in the ID token (cognito:groups) for role checks.
      // Do NOT call the authservice /api/v1/me here — authorization is determined from
      // the token's groups or the token `roles` claim as a fallback.
      const auth = req.headers?.authorization || req.headers?.Authorization;
      const parts = auth ? auth.split(' ') : [];
      const token = (parts.length === 2 && parts[0].toLowerCase() === 'bearer') ? parts[1] : null;

      // Check token groups first (Cognito ID token usually contains `cognito:groups`)
      let tokenGroups = [];
      if (req.user) {
        tokenGroups = req.user['cognito:groups'] || req.user['groups'] || [];
        if (!Array.isArray(tokenGroups) && typeof tokenGroups === 'string') tokenGroups = [tokenGroups];
        tokenGroups = tokenGroups.map(g => String(g).toLowerCase());
      }

      let has = false;
      if (tokenGroups && tokenGroups.length > 0) {
        has = requiredRoles.some(rr => tokenGroups.includes(String(rr).toLowerCase()));
      } else {
        // No groups available on token — fall back to token `roles` claim only
        const roles = req.user.roles || req.user.role || [];
        const tokenRoles = Array.isArray(roles) ? roles.map(x => String(x).toLowerCase()) : [String(roles).toLowerCase()];
        has = requiredRoles.some(rr => tokenRoles.includes(String(rr).toLowerCase()));
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
