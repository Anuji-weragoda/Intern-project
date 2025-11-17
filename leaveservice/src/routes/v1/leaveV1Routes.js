import express from 'express';
import {
  getLeaveBalance,
  createLeaveRequest,
  patchLeaveRequest,
  viewLeaveRequests,
} from '../../controllers/leaveController.js';
import { validateBody } from '../../middleware/validate.js';
import { createLeaveSchema, patchLeaveSchema } from '../../validation/leaveSchemas.js';
import { requireAuth } from '../../middleware/authClaims.js';

const router = express.Router();

// GET /api/v1/leave/balance?user_id=
router.get('/balance', requireAuth(), getLeaveBalance);

// GET /api/v1/leave/requests?user_id=&status=&page=&size=
router.get('/requests', requireAuth(), viewLeaveRequests);

// POST /api/v1/leave/requests
router.post('/requests', requireAuth(), validateBody(createLeaveSchema), createLeaveRequest);

// PATCH /api/v1/leave/requests/:id
router.patch('/requests/:id', requireAuth(), validateBody(patchLeaveSchema), patchLeaveRequest);

export default router;
