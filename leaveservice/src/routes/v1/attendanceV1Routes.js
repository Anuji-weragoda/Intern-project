import express from 'express';
import { clockIn, clockOut, attendanceHistory } from '../../controllers/attendanceController.js';
import { validateBody } from '../../middleware/validate.js';
import { clockInSchema, clockOutSchema } from '../../validation/attendanceSchemas.js';
import { requireAuth } from '../../middleware/authClaims.js';

const router = express.Router();

// GET /api/v1/attendance?user_id=&range=&page=&size=
router.get('/', requireAuth(), attendanceHistory);

// POST /api/v1/attendance/clock-in
router.post('/clock-in', requireAuth(), validateBody(clockInSchema), clockIn);

// POST /api/v1/attendance/clock-out
router.post('/clock-out', requireAuth(), validateBody(clockOutSchema), clockOut);

export default router;
