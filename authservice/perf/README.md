# Performance tests for authservice (k6)

This folder contains a k6 smoke test for the Spring Boot authservice.

Files:
- `auth-k6.js` - k6 script (bearer-token run)
- `k6-auth.env.sample` - sample env file to store AUTH_BEARER (do not commit secrets)
- `run-smoke.ps1` - helper to run the smoke test via Docker on Windows
- `parse-k6.ps1` - simple parser to summarize k6 NDJSON output
- `results/` - sample results and reports

Quick run (PowerShell):
- Edit `k6-auth.env.sample` and add a line: AUTH_BEARER=Bearer <your-token-here>
- From this folder run: `./run-smoke.ps1`

Notes:
- The script intentionally avoids session-only endpoints (logout, token endpoints) that require an interactive browser session — these produced redirects to the frontend in earlier runs and caused false failures.
- Keep any real tokens out of source control. Rename `k6-auth.env.sample` to `k6-auth.env` locally and add it to .gitignore if you choose to keep it.
