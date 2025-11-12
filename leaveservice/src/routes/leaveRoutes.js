// Leave routes for leave-related endpoints
import express from 'express';
import { submitLeaveRequest, approveLeaveRequest, rejectLeaveRequest, viewLeaveRequests } from '../controllers/leaveController.js';
import { validateBody } from '../middleware/validate.js';
import { createLeaveSchema, patchLeaveSchema } from '../validation/leaveSchemas.js';
import { requireAuth } from '../middleware/authClaims.js';

const router = express.Router();

// POST /api/leaves - Submit leave request
router.post('/', validateBody(createLeaveSchema), submitLeaveRequest);
// PATCH /api/leaves/:id/approve - Approve leave request (protected)
router.patch('/:id/approve', requireAuth(), validateBody(patchLeaveSchema), approveLeaveRequest);
// PATCH /api/leaves/:id/reject - Reject leave request (protected)
router.patch('/:id/reject', requireAuth(), validateBody(patchLeaveSchema), rejectLeaveRequest);
// GET /api/leaves - View leave requests
router.get('/', viewLeaveRequests);

export default router;
