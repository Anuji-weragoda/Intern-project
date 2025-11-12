import express from 'express';
import { leaveSummary } from '../controllers/reportsController.js';

const router = express.Router();

// GET /api/v1/reports/leave-summary?range=&team_id=
router.get('/leave-summary', leaveSummary);

export default router;
