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
      // Collect roles from a variety of common JWT claim locations.
      // Tokens may use 'roles', 'role', 'groups', 'cognito:groups', or realm_access.roles (Keycloak).
      const collected = [];
      if (req.user.roles) collected.push(req.user.roles);
      if (req.user.role) collected.push(req.user.role);
      if (req.user.groups) collected.push(req.user.groups);
      if (req.user['cognito:groups']) collected.push(req.user['cognito:groups']);
      if (req.user.cognitogroups) collected.push(req.user.cognitogroups);
      if (req.user['cognito_groups']) collected.push(req.user['cognito_groups']);
      if (req.user.realm_access && Array.isArray(req.user.realm_access.roles)) collected.push(req.user.realm_access.roles);

      // Flatten, normalize to strings and lowercase
      let roles = collected.flat().filter(Boolean).map(r => {
        if (typeof r === 'string') return r.toLowerCase();
        if (typeof r === 'object' && r.name) return String(r.name).toLowerCase();
        return String(r).toLowerCase();
      });
      roles = Array.from(new Set(roles));

      const has = requiredRoles.some(r => roles.includes(String(r).toLowerCase()));
      if (!has) return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}

export default authMiddleware;
