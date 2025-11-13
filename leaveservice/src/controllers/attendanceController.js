import * as attendanceService from '../services/attendanceService.js';
import { trimStringsDeep } from '../utils/trim.js';

export async function getAttendance(req, res) {
  try {
  // If authenticated, restrict/override query user_id to the token subject
  const query = trimStringsDeep(Object.assign({}, req.query));
  if (req.user && req.user.sub) query.user_id = req.user.sub;
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

