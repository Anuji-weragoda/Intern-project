Leave Service Postman collection

This folder contains the Postman collection and environment for testing the Leave & Attendance microservice locally.

Files
- `leave-service.postman_collection.json` - The collection with Positive and Negative test folders.
- `leave-service.environment.json` - Example environment file with placeholders for auth and other variables.

Quick start
1. Start the Leave Service locally (recommended to run from the `leaveservice` folder):

   ```powershell
   $env:SEQ_LOGGING='true'; node src/server.js
   ```

2. Start the Authservice locally (if you plan to fetch real tokens via the collection):

   ```powershell
   cd authservice
   ./mvnw spring-boot:run
   ```

3. Configure the Postman environment:
   - Open Postman → Environments → Import → select `leave-service.environment.json`.
   - Edit the environment and fill in either:
     - `idToken` — paste a real Cognito ID token (easy for one-off tests), OR
     - `token_url`, `client_id`, `client_secret` (optional), `username`, `password` — to let the collection fetch a token using ROPC (if your identity provider supports it).

4. Run the collection in Postman Runner or with Newman.

Running with Newman (recommended for CI):

```powershell
# run from the leaveservice folder
$env:NO_PROXY='localhost,127.0.0.1'; npm run postman:run
```

Notes
- Many Cognito setups disallow ROPC. If token fetch fails using username/password, obtain an ID token via your provider's hosted login and paste it into `idToken`.
- Approve/Reject requests require a token that grants approver permissions. Use a test user that has the necessary roles/claims.
- If you see ECONNREFUSED to 127.0.0.1:8081, check Postman proxy settings or your system proxy environment variables.

Adding assertions
- If you want automated pass/fail checks, I can add test scripts to each request (asserting HTTP codes and response shapes) and update the Newman run to fail on assertions.
