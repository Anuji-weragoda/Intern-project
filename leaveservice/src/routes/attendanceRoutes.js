// Attendance routes for attendance-related endpoints
import express from 'express';
import { clockIn, clockOut, attendanceHistory } from '../controllers/attendanceController.js';
import { validateBody } from '../middleware/validate.js';
import { clockInSchema, clockOutSchema } from '../validation/attendanceSchemas.js';
import { requireAuth } from '../middleware/authClaims.js';

const router = express.Router();

// POST /api/attendance/clock-in - Clock in (requires auth)
router.post('/clock-in', requireAuth(), validateBody(clockInSchema), clockIn);
// POST /api/attendance/clock-out - Clock out (requires auth)
router.post('/clock-out', requireAuth(), validateBody(clockOutSchema), clockOut);
// GET /api/attendance - Attendance history (requires auth)
router.get('/', requireAuth(), attendanceHistory);

export default router;
