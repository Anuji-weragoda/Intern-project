import * as attendanceService from '../services/attendanceService.js';
import { trimStringsDeep } from '../utils/trim.js';

export async function getAttendance(req, res) {
  try {
  // If authenticated, restrict/override query user_id to the token subject
  const query = trimStringsDeep(Object.assign({}, req.query));
  // If a user is authenticated, we normally restrict to their own records when no explicit user_id is provided.
  // However, users in privileged groups (e.g., 'hr' or 'admin') should be allowed to query across users.
  if (req.user && !query.user_id) {
    try {
      const groups = req.user['cognito:groups'] || req.user.groups || [];
      const roles = req.user.roles || req.user.role || [];
      const normGroups = Array.isArray(groups) ? groups.map(g => String(g).toLowerCase()) : [String(groups).toLowerCase()];
      const normRoles = Array.isArray(roles) ? roles.map(r => String(r).toLowerCase()) : [String(roles).toLowerCase()];
      const privileged = [...normGroups, ...normRoles].some(x => ['hr', 'admin'].includes(x));
      if (!privileged) {
        // non-privileged: restrict to their own sub
        if (req.user.sub) query.user_id = req.user.sub;
      }
      // privileged users: allow leaving query.user_id undefined to fetch all users
    } catch (e) {
      // on unexpected token shape, be conservative and restrict to subject when available
      if (req.user.sub) query.user_id = req.user.sub;
    }
  }
  const results = await attendanceService.attendanceHistory(query);
    return res.json(results);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function clockIn(req, res) {
  try {
    // Dev debug: show incoming payload types/values
  // eslint-disable-next-line no-console
  const payload = trimStringsDeep(Object.assign({}, req.body));
  if (req.user && req.user.sub) payload.user_id = req.user.sub;
    const result = await attendanceService.clockIn(payload);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function clockOut(req, res) {
  try {
  const payload = trimStringsDeep(Object.assign({}, req.body));
  if (req.user && req.user.sub) payload.user_id = req.user.sub;
    const result = await attendanceService.clockOut(payload);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// Backwards-compatible export expected by legacy routes
export async function attendanceHistory(req, res) {
  return getAttendance(req, res);
}

