import provisionService from '../services/provisionService.js';

// POST /webhooks/user-created
export async function userCreated(req, res) {
  try {
    const payload = req.body || {};
    const userId = payload.id || payload.user_id || payload.sub;
    if (!userId) return res.status(400).json({ error: 'user id missing in payload' });

    // Basic auth: optional static secret header for service-to-service calls
    const secret = process.env.WEBHOOK_SECRET;
    const hdr = req.headers['x-service-secret'] || req.headers['x-service-token'];
    if (secret && hdr && hdr === secret) {
      // proceed
    } else {
      // If no secret configured, require that req.user exists (claims middleware)
      if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    }

    const created = await provisionService.ensureBalancesForUser(userId);
    return res.status(202).json({ ok: true, created });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default { userCreated };
