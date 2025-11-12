import app from './app.js';

// Ensure server uses UTC for all date handling by default in local/dev.
// This prevents Postgres timezone name formatting issues (e.g. "GMT+0530").
process.env.TZ = process.env.TZ || 'UTC';

const PORT = process.env.PORT || 3000;

// Start server and handle common startup errors (like EADDRINUSE) more gracefully
const server = app.listen(PORT, () => {
  // Keep this log minimal and parseable for local testing
  // Do not expose secrets here
  // eslint-disable-next-line no-console
  console.log(`Express server listening on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  // Provide a friendly message for address-in-use and exit with non-zero code
  // eslint-disable-next-line no-console
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the process using it or set PORT to another free port and retry.`);
    // give a hint for Windows users
    console.error('On Windows: run `netstat -ano | findstr :'+PORT+'` to locate the PID, then `taskkill /PID <pid> /F` to kill it.');
    process.exit(1);
  }
  // otherwise rethrow
  throw err;
});

export default app;
