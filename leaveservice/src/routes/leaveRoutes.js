// Leave routes for leave-related endpoints
import express from 'express';
import { submitLeaveRequest, approveLeaveRequest, rejectLeaveRequest, viewLeaveRequests } from '../controllers/leaveController.js';
import { validateBody } from '../middleware/validate.js';
import { createLeaveSchema, patchLeaveSchema } from '../validation/leaveSchemas.js';
import { requireAuth } from '../middleware/authClaims.js';

const router = express.Router();

// POST /api/leaves - Submit leave request
// Require authentication for creating leave and viewing personal leave requests
router.post('/', requireAuth(), validateBody(createLeaveSchema), submitLeaveRequest);
// PATCH /api/leaves/:id/approve - Approve leave request (protected)
// Only HR users may approve leave requests
router.patch('/:id/approve', requireAuth(['hr']), validateBody(patchLeaveSchema), approveLeaveRequest);
// PATCH /api/leaves/:id/reject - Reject leave request (protected)
// Only HR users may reject leave requests
router.patch('/:id/reject', requireAuth(['hr']), validateBody(patchLeaveSchema), rejectLeaveRequest);
// GET /api/leaves - View leave requests
router.get('/', requireAuth(), viewLeaveRequests);

export default router;
