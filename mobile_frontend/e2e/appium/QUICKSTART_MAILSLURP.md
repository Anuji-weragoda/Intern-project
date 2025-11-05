# MailSlurp Signup E2E Test - Quick Start Guide

## What Was Created

I've created a comprehensive Appium E2E test suite for Flutter mobile app signup with email verification using MailSlurp.

### Files Created:

1. **`specs/signup_mailslurp.e2e.js`** - Main test file with 2 tests:
   - Full signup flow with email verification
   - Invalid OTP rejection test

2. **`MAILSLURP_SIGNUP_TEST.md`** - Comprehensive documentation

3. **`mailslurp-example.js`** - Helper script for testing MailSlurp connection

## Quick Start (5 minutes)

### Step 1: Get MailSlurp API Key (Free)

1. Go to: https://app.mailslurp.com
2. Sign up (free account - 100 emails/month)
3. Navigate to "API Keys"
4. Copy your API key

### Step 2: Set Environment Variables

```powershell
# Set your MailSlurp API key
$env:MAILSLURP_API_KEY="your-mailslurp-api-key-here"

# Set your Android device/emulator ID
$env:ANDROID_UDID="emulator-5554"
```

### Step 3: Test MailSlurp Connection (Optional but Recommended)

```bash
cd mobile_frontend/e2e/appium
node mailslurp-example.js test-connection
```

This will verify your API key works and show you how emails are sent/received.

### Step 4: Run the Test

```bash
npx wdio run wdio.conf.js --spec specs\signup_mailslurp.e2e.js
```

## What The Test Does

```
┌─────────────────────────────────────────────────────────┐
│  1. Create MailSlurp Inbox (test-abc123@mailslurp.com) │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  2. Launch Flutter App → Navigate to Signup Screen     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  3. Fill Form (email, password, confirm password)      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  4. Submit Signup Form                                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  5. Backend Sends Verification Email                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  6. Wait for Email (up to 60 seconds)                   │
│     MailSlurp receives: "Your code is: 123456"          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  7. Extract OTP Code (123456) from Email Body           │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  8. Enter OTP in Verification Screen                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  9. Submit Verification                                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  10. ✓ Verify Dashboard is Visible (User Logged In)    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  11. Cleanup: Delete MailSlurp Inbox                    │
└─────────────────────────────────────────────────────────┘
```

## Expected Output (Success)

```
=== Sign Up with MailSlurp E2E: Starting suite ===
Initializing MailSlurp client...
Step 1: Creating new MailSlurp inbox...
Created test inbox: test-abc123@mailslurp.com
Step 2: Navigating to signup screen...
Clicked Sign Up navigation button
Step 3: Filling signup form...
Typing email into selector...
Typing password into selector...
Step 4: Submitting signup form...
Clicked Sign Up submit button
Step 5: Waiting for verification screen...
Verification screen detected
Step 6: Waiting for verification email...
This may take up to 60 seconds...
Received email from: noreply@yourapp.com
Email subject: Verify Your Account
Step 7: Extracting OTP from email...
Extracted OTP: 123456
Step 8: Entering OTP in verification screen...
Entered OTP: 123456
Step 9: Submitting OTP...
Clicked Verify button
Step 10: Verifying successful login...
Dashboard root found via content-desc
SignUp MailSlurp E2E: Test completed successfully!

✓ should complete full signup flow with email verification (45s)

1 passing (45s)
```

## Test Artifacts Generated

After running, check these folders:

```
mobile_frontend/e2e/appium/artifacts/
├── screenshots/
│   ├── 01-inbox-created.png
│   ├── 03-signup-screen.png
│   ├── 04-email-entered.png
│   ├── 09-verification-screen.png
│   ├── 11-otp-entered.png
│   └── 13-dashboard.png
├── pagesource/
│   ├── signup-form-filled.xml
│   ├── verification-screen.xml
│   └── dashboard-after-signup.xml
└── run-result-mailslurp-signup.json
```

## Troubleshooting

### "MAILSLURP_API_KEY environment variable is required"

```powershell
# Check if it's set
echo $env:MAILSLURP_API_KEY

# If empty, set it
$env:MAILSLURP_API_KEY="your-key-here"
```

### "Timeout waiting for email"

1. Check your app's email service is working
2. Login to MailSlurp dashboard to see if email arrived
3. Increase timeout in test (line with `emailTimeout = 60000`)

### "Failed to extract OTP from email body"

1. Check console output for "Email body preview"
2. Your email format may be different
3. Update `extractOtpFromEmail()` function to match your format

### Element Selectors Not Working

1. Check screenshots in `artifacts/screenshots/`
2. Add Semantics labels to your Flutter widgets:

```dart
// In your Flutter signup screen
Semantics(
  label: 'email_input',
  child: TextField(...)
)

Semantics(
  label: 'signup_button',
  child: ElevatedButton(...)
)
```

## Features

### ✅ Robust Element Detection
- Multiple fallback selectors for each element
- Works with different Flutter UI structures

### ✅ Flexible OTP Extraction
- Supports multiple email formats
- Handles various OTP patterns (code:, OTP:, PIN:, etc.)

### ✅ Comprehensive Logging
- Step-by-step console output
- Screenshots at each critical step
- Page source dumps for debugging

### ✅ Automatic Cleanup
- Deletes test inbox after each run
- No leftover test data

### ✅ Two Test Scenarios
- Happy path: Valid OTP → successful login
- Error path: Invalid OTP → error message

## Integration Ideas

### CI/CD Pipeline

```yaml
# .github/workflows/e2e-signup.yml
name: E2E Signup Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Run Signup Test
        env:
          MAILSLURP_API_KEY: ${{ secrets.MAILSLURP_API_KEY }}
        run: |
          cd mobile_frontend/e2e/appium
          npm install
          npx wdio run wdio.conf.js --spec specs/signup_mailslurp.e2e.js
```

### Scheduled Testing

Run signup tests nightly to catch email delivery issues:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
```

## Cost Considerations

### MailSlurp Free Tier:
- ✅ 100 emails/month
- ✅ 5 concurrent inboxes
- ✅ Perfect for development

### For CI/CD:
- 1 test run = 1 email
- ~30 test runs = $0 (free tier)
- Paid plans: $19/month for unlimited

## Next Steps

1. **Customize Selectors**: Update element selectors to match your Flutter app
2. **Add Flutter Labels**: Add Semantics labels to your signup widgets
3. **Test Email Format**: Verify your verification email format
4. **Run First Test**: Execute the test and check screenshots
5. **Integrate CI/CD**: Add to your pipeline

## Support Resources

- 📖 **Full Documentation**: `MAILSLURP_SIGNUP_TEST.md`
- 🔧 **Example Script**: `mailslurp-example.js`
- 📸 **Screenshots**: `artifacts/screenshots/`
- 🐛 **Debug Info**: `artifacts/pagesource/`

## Questions?

Common issues and solutions are documented in `MAILSLURP_SIGNUP_TEST.md` under the "Troubleshooting" section.

---

**Created**: November 5, 2025  
**Test Type**: E2E (End-to-End)  
**Platform**: Android (Flutter)  
**Tool**: Appium + WebdriverIO + MailSlurp  
**Status**: ✅ Ready to use
