// Main Express app and Lambda handler
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';
import leaveRoutes from './routes/leaveRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import authMiddleware from './middleware/authClaims.js';
import integrationsV1Routes from './routes/integrationsRoutes.js';
import reportsV1Routes from './routes/reportsRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

const app = express();
app.use(express.json());

// Attach claims-first auth middleware (non-blocking). It will populate req.user when possible.
app.use(authMiddleware);

// Health check
app.get('/healthz', (req, res) => res.send('OK'));

// API routes (legacy)
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);

// API v1 routes removed per project decision; keep legacy routes and other API groups
app.use('/api/v1/integrations', integrationsV1Routes);
app.use('/api/v1/reports', reportsV1Routes);
// Webhooks for event-driven provisioning
app.use('/webhooks', webhookRoutes);

// Export Lambda handler
export const handler = serverlessExpress({ app });

export default app;
