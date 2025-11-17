// Main Express app and Lambda handler
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';
import leaveRoutes from './routes/leaveRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import authMiddleware from './middleware/authClaims.js';
import integrationsV1Routes from './routes/integrationsRoutes.js';
import reportsV1Routes from './routes/reportsRoutes.js';
import leaveV1Routes from './routes/v1/leaveV1Routes.js';
import attendanceV1Routes from './routes/v1/attendanceV1Routes.js';
import webhookRoutes from './routes/webhookRoutes.js';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  // Must match your frontend origin exactly
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); 
  res.header('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PATCH, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Add this line for credentials
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});


// Attach claims-first auth middleware (non-blocking). It will populate req.user when possible.
app.use(authMiddleware);

// Health check
app.get('/healthz', (req, res) => res.send('OK'));

// API routes (legacy)
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);

// API v1 compatibility routes (aliases to existing controllers)
app.use('/api/v1/leave', leaveV1Routes);
app.use('/api/v1/attendance', attendanceV1Routes);

// API v1 routes removed per project decision; keep legacy routes and other API groups
app.use('/api/v1/integrations', integrationsV1Routes);
app.use('/api/v1/reports', reportsV1Routes);
// Webhooks for event-driven provisioning
app.use('/webhooks', webhookRoutes);

// Export Lambda handler
export const handler = serverlessExpress({ app });

export default app;
