// Attendance routes for attendance-related endpoints
import express from 'express';
import { clockIn, clockOut, attendanceHistory } from '../controllers/attendanceController.js';
import { validateBody } from '../middleware/validate.js';
import { clockInSchema, clockOutSchema } from '../validation/attendanceSchemas.js';
import { requireAuth } from '../middleware/authClaims.js';

const router = express.Router();

// POST /api/attendance/clock-in - Clock in
router.post('/clock-in', validateBody(clockInSchema), clockIn);
// POST /api/attendance/clock-out - Clock out
router.post('/clock-out', validateBody(clockOutSchema), clockOut);
// GET /api/attendance - Attendance history
router.get('/', attendanceHistory);

export default router;
