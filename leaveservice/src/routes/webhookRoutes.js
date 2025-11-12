import express from 'express';
import { userCreated } from '../controllers/webhookController.js';

const router = express.Router();

// Receive user.created events
router.post('/user-created', userCreated);

export default router;
