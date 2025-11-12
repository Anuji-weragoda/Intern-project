import * as attendanceService from '../services/attendanceService.js';

export async function getAttendance(req, res) {
  try {
    const results = await attendanceService.attendanceHistory(req.query);
    return res.json(results);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function clockIn(req, res) {
  try {
    const result = await attendanceService.clockIn(req.body);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function clockOut(req, res) {
  try {
    const result = await attendanceService.clockOut(req.body);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// Backwards-compatible export expected by legacy routes
export async function attendanceHistory(req, res) {
  return getAttendance(req, res);
}

