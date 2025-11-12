import express from 'express';
import { msgraphSync } from '../controllers/integrationsController.js';

const router = express.Router();

// POST /api/v1/integrations/msgraph/sync
router.post('/msgraph/sync', msgraphSync);

export default router;
