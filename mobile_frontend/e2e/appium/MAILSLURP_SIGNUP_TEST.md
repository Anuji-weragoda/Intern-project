# MailSlurp Signup E2E Test Documentation

## Overview

This test automates the complete user signup flow for the Flutter mobile app, including email verification using MailSlurp's temporary email service.

## Test Flow

The test performs the following steps:

1. **Create Test Inbox**: Uses MailSlurp API to create a temporary email inbox
2. **Launch App**: Opens the Flutter app on Android emulator/device
3. **Navigate to Signup**: Finds and clicks the "Sign Up" button
4. **Fill Signup Form**: Enters the generated email address and password
5. **Submit Registration**: Clicks the signup submit button
6. **Wait for Email**: Monitors the MailSlurp inbox for the verification email (up to 60 seconds)
7. **Extract OTP**: Parses the email body to extract the 6-digit verification code
8. **Enter OTP**: Types the code into the verification screen
9. **Submit Verification**: Clicks the verify button
10. **Verify Dashboard**: Confirms the user is logged in and sees the dashboard

## Prerequisites

### 1. MailSlurp API Key

You need a MailSlurp API key to run this test.

1. Sign up for a free account at: https://app.mailslurp.com
2. Navigate to your API Keys section
3. Copy your API key
4. Set it as an environment variable (see below)

**Free Tier Limits:**
- 100 emails per month
- 5 inboxes at a time
- Perfect for testing!

### 2. Environment Variables

Set the following environment variables before running the test:

**Windows PowerShell:**
```powershell
$env:MAILSLURP_API_KEY="your-mailslurp-api-key-here"
$env:ANDROID_UDID="emulator-5554"  # or your device ID
```

**Windows CMD:**
```cmd
set MAILSLURP_API_KEY=your-mailslurp-api-key-here
set ANDROID_UDID=emulator-5554
```

**Linux/Mac:**
```bash
export MAILSLURP_API_KEY="your-mailslurp-api-key-here"
export ANDROID_UDID="emulator-5554"
```

### 3. Dependencies

The test requires the following npm package (already installed):

```bash
npm install mailslurp-client --save-dev
```

## Running the Test

### Run Full Suite (Both Tests)

```powershell
cd mobile_frontend\e2e\appium
$env:MAILSLURP_API_KEY="your-api-key"
$env:ANDROID_UDID="emulator-5554"
npx wdio run wdio.conf.js --spec specs\signup_mailslurp.e2e.js
```

### Run Specific Test

**Full signup flow:**
```powershell
npx wdio run wdio.conf.js --spec specs\signup_mailslurp.e2e.js --mochaOpts.grep "should complete full signup flow"
```

**Invalid OTP test:**
```powershell
npx wdio run wdio.conf.js --spec specs\signup_mailslurp.e2e.js --mochaOpts.grep "should reject invalid OTP"
```

## Test Configuration

### Timeouts

- **Full signup test**: 180 seconds (3 minutes)
  - Allows time for email delivery and processing
- **Invalid OTP test**: 120 seconds (2 minutes)

### Email Wait Time

The test waits up to **60 seconds** for the verification email to arrive. Most emails arrive within 5-10 seconds.

## Expected Email Format

The test can extract OTP codes from various email formats:

- Simple 6-digit codes: `123456`
- Labeled codes: `Your verification code: 123456`
- Full sentences: `Your verification code is 123456`
- OTP labels: `OTP: 123456`
- PIN labels: `PIN: 123456`

**Example email body:**
```
Welcome to our app!

Your verification code is: 123456

Please enter this code to complete your registration.
```

## Troubleshooting

### Issue: "MAILSLURP_API_KEY environment variable is required"

**Solution**: Make sure you've set the environment variable before running the test.

```powershell
$env:MAILSLURP_API_KEY="your-actual-api-key"
echo $env:MAILSLURP_API_KEY  # Verify it's set
```

### Issue: "Timeout waiting for email"

**Causes:**
1. Email delivery is slow (rare but possible)
2. Signup didn't complete successfully
3. Email went to spam or wasn't sent

**Solutions:**
- Check the app's backend logs to verify email was sent
- Manually log into MailSlurp dashboard to see if email arrived
- Increase `emailTimeout` in the test (currently 60 seconds)
- Verify your app's email service is configured correctly

### Issue: "Failed to extract OTP from email body"

**Causes:**
1. Email format doesn't match expected patterns
2. OTP is in HTML format, not plain text
3. Email body is empty

**Solutions:**
- Check the test console output for "Email body preview"
- Update `extractOtpFromEmail()` function to match your email format
- Check MailSlurp dashboard to see actual email content

### Issue: "Element not found" errors

**Causes:**
1. Flutter app UI has changed
2. Accessibility labels are different
3. Timing issues

**Solutions:**
- Check screenshots in `artifacts/screenshots/` folder
- Review page source in `artifacts/pagesource/` folder
- Update element selectors in the test
- Add Semantics labels to Flutter widgets

### Issue: Test inbox not cleaned up

**Solution**: The test automatically deletes the inbox in the `after()` hook. If it fails:

```javascript
// Manually delete via MailSlurp dashboard or API
const { MailSlurp } = require('mailslurp-client');
const mailslurp = new MailSlurp({ apiKey: 'your-key' });
await mailslurp.deleteInbox('inbox-id');
```

## Artifacts

The test generates the following artifacts:

### Screenshots
Location: `artifacts/screenshots/`

- `01-inbox-created.png` - Initial state
- `02-initial-screen.png` - App launched
- `03-signup-screen.png` - Signup form visible
- `04-email-entered.png` - Email filled
- `05-password-entered.png` - Password filled
- `07-form-complete.png` - All fields filled
- `08-after-signup-submit.png` - After submitting form
- `09-verification-screen.png` - OTP screen
- `10-email-received.png` - After email arrives
- `11-otp-entered.png` - OTP typed in
- `12-after-verify.png` - After submitting OTP
- `13-dashboard.png` - Final dashboard state
- `99-failure-screenshot.png` - Error state (if test fails)

### Page Sources
Location: `artifacts/pagesource/`

- `signup-initial.xml` - Initial app state
- `signup-form-filled.xml` - Form completed
- `verification-screen.xml` - OTP entry screen
- `dashboard-after-signup.xml` - Successful login
- `signup-failure.xml` - Error state (if test fails)

### Test Results
Location: `artifacts/run-result-mailslurp-signup.json`

```json
{
  "title": "should complete full signup flow with email verification",
  "state": "passed",
  "duration": 45230,
  "timestamp": "2025-11-05T08:30:45.123Z",
  "email": "test-abc123@mailslurp.com"
}
```

## Best Practices

### 1. API Key Security

**DO NOT** commit your API key to version control!

Add to `.gitignore`:
```
.env
*.key
```

Use environment variables or a `.env` file:
```bash
# .env
MAILSLURP_API_KEY=your-key-here
```

### 2. Test Isolation

Each test run creates a fresh inbox and cleans it up afterward. This ensures:
- No conflicts between test runs
- No leftover test data
- Consistent test environment

### 3. Rate Limiting

MailSlurp free tier has rate limits. For CI/CD:
- Run signup tests separately from other tests
- Consider upgrading to paid plan for unlimited tests
- Use `--spec` flag to run only when needed

### 4. Retry Logic

For flaky tests, add retry in `wdio.conf.js`:

```javascript
mochaOpts: {
  retries: 2  // Retry failed tests up to 2 times
}
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: E2E Tests - Signup with MailSlurp

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd mobile_frontend/e2e/appium
          npm install
      
      - name: Start Android Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 30
          script: echo "Emulator started"
      
      - name: Run MailSlurp Signup Test
        env:
          MAILSLURP_API_KEY: ${{ secrets.MAILSLURP_API_KEY }}
          ANDROID_UDID: emulator-5554
        run: |
          cd mobile_frontend/e2e/appium
          npx wdio run wdio.conf.js --spec specs/signup_mailslurp.e2e.js
      
      - name: Upload Artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-artifacts
          path: mobile_frontend/e2e/appium/artifacts/
```

## Advanced Customization

### Custom Email Patterns

If your app uses a specific email format, update `extractOtpFromEmail()`:

```javascript
const extractOtpFromEmail = (emailBody) => {
  // Your custom pattern
  const match = emailBody.match(/Your special code is: (\d{6})/);
  return match ? match[1] : null;
};
```

### Multiple Email Formats

Support different email templates:

```javascript
const extractOtpFromEmail = (emailBody) => {
  const patterns = [
    /code:\s*(\d{6})/i,           // Format 1
    /verification:\s*(\d{6})/i,   // Format 2
    /\[(\d{6})\]/,                // Format 3: [123456]
  ];
  
  for (const pattern of patterns) {
    const match = emailBody.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};
```

### HTML Email Support

If emails are HTML-only:

```javascript
// Install cheerio for HTML parsing
npm install cheerio --save-dev

// In test:
const cheerio = require('cheerio');

const extractOtpFromEmail = (emailBody) => {
  const $ = cheerio.load(emailBody);
  const codeText = $('.verification-code').text(); // Update selector
  const match = codeText.match(/\d{6}/);
  return match ? match[0] : null;
};
```

## Support

- **MailSlurp Docs**: https://docs.mailslurp.com/
- **WebdriverIO Docs**: https://webdriver.io/
- **Appium Docs**: https://appium.io/docs/

## License

This test suite is part of the Staff Management System project.
