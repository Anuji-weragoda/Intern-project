import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  // Keep this log minimal and parseable for local testing
  // Do not expose secrets here
  // eslint-disable-next-line no-console
  console.log(`Express server listening on http://localhost:${PORT}`);
});

export default app;
