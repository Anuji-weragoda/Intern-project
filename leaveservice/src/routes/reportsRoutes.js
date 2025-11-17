import express from 'express';
import { leaveSummary, userBalances } from '../controllers/reportsController.js';

const router = express.Router();

// GET /api/v1/reports/leave-summary?range=&team_id=
router.get('/leave-summary', leaveSummary);

// GET /api/v1/reports/user-balances?year=2025&limit=100&offset=0
router.get('/user-balances', userBalances);

export default router;
