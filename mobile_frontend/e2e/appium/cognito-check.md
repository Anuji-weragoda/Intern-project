# AWS Cognito Email Verification Setup Check

## Issue: No verification email received from Cognito

When using AWS Cognito with MailSlurp for testing, you may encounter issues because:

### Common Cognito Email Problems

#### 1. **SES Sandbox Mode** (Most Common)

By default, AWS SES (which Cognito uses) is in **sandbox mode**, meaning it can ONLY send to:
- Verified email addresses
- Verified domains

**MailSlurp addresses are NOT verified**, so emails won't be delivered.

**Solution Options:**

**Option A: Move out of SES Sandbox (Recommended for testing)**
1. Go to AWS SES Console
2. Click "Account Dashboard" 
3. Click "Request production access"
4. Fill out the form (usually approved within 24 hours)
5. Once approved, Cognito can send to ANY email address

**Option B: Use Cognito's Default Email (Limited)**
1. Go to AWS Cognito Console
2. Select your User Pool
3. Go to "Messaging" → "Email"
4. Select "Send email with Cognito" (default)
5. **Limitation**: Only 50 emails per day

**Option C: Verify MailSlurp domain in SES (Not practical for testing)**
- You'd need to verify `mailslurp.biz` domain (which you can't control)

#### 2. **Cognito User Pool Not Configured for Email Verification**

Check your User Pool settings:

1. Go to AWS Cognito Console
2. Select your User Pool
3. Go to "Sign-up experience" → "Required attributes"
4. Ensure "Email" is marked as required
5. Go to "Messaging" → "Email verification"
6. Ensure verification is enabled

#### 3. **SES Email Identity Not Verified**

If using your own email (not Cognito default):

1. Go to AWS SES Console
2. Click "Verified identities"
3. Verify your "from" email address or domain

## Recommended Test Setup

### For Development/Testing:

**Use Cognito's Built-in Email:**
```
User Pool → Messaging → Email:
☑️ Send email with Cognito (default)
```

This works immediately but has limits (50 emails/day).

### For Production/CI:

**Use SES with Production Access:**
```
User Pool → Messaging → Email:
☑️ Send email with Amazon SES
   - Configure SES region
   - Configure FROM email address
   - Request production access (remove sandbox)
```

## Quick Diagnostic Steps

### Step 1: Check Current Email Configuration

```bash
# Using AWS CLI
aws cognito-idp describe-user-pool --user-pool-id <your-pool-id> --region <region>
```

Look for:
```json
{
  "EmailConfiguration": {
    "EmailSendingAccount": "COGNITO_DEFAULT" // or "DEVELOPER"
  },
  "AutoVerifiedAttributes": ["email"],
  "MfaConfiguration": "OPTIONAL",
  "UserAttributeUpdateSettings": {
    "AttributesRequireVerificationBeforeUpdate": ["email"]
  }
}
```

### Step 2: Test with a Real Email First

Before using MailSlurp, test with a real email address you control:

1. Manually sign up in your app with `youremail@gmail.com`
2. Check if you receive the verification email
3. If YES → Cognito works, but SES is in sandbox
4. If NO → Cognito email is not configured properly

### Step 3: Check SES Sending Statistics

```bash
# Check if any emails were sent
aws sesv2 get-account --region <region>
```

Look for:
```json
{
  "ProductionAccessEnabled": false, // <-- Sandbox mode
  "SendingEnabled": true
}
```

If `ProductionAccessEnabled: false`, you're in sandbox mode.

## Solution for Testing (Immediate)

### Option 1: Use Verified Email Addresses

Create a verified test email in SES:

1. Go to AWS SES Console
2. Click "Verified identities"
3. Click "Create identity"
4. Select "Email address"
5. Enter your test email (e.g., `test@yourdomain.com`)
6. Verify it
7. Use this email in your tests instead of MailSlurp

### Option 2: Request SES Production Access

1. Go to AWS SES Console
2. Click "Get started" or "Request production access"
3. Fill out the form:
   - **Use case**: Testing/development
   - **Website**: Your app URL
   - **Describe how you'll use SES**: "Automated testing for user signup"
   - **How you'll handle bounces**: "Monitor SES metrics"
4. Submit
5. Usually approved within 24 hours

### Option 3: Use Cognito Default Email (Quick Fix)

1. Go to Cognito Console
2. User Pool → Messaging → Email
3. Select "Send email with Cognito"
4. Save changes
5. **Limitation**: 50 emails/day (fine for testing)

## Update Your Test

Once Cognito is configured and sending emails, run the updated test:

```powershell
$env:MAILSLURP_API_KEY="your-key"
$env:ANDROID_UDID="emulator-5554"

npx wdio run wdio.conf.js --spec specs\signup_mailslurp.e2e.js
```

The test now:
- Waits 120 seconds for email (instead of 60)
- Checks for Cognito-specific email formats
- Provides better error messages

## Verify It's Working

### Manual Test:

1. Open your Flutter app
2. Sign up with: `youremail@gmail.com`
3. Check your email
4. If you receive the code → Cognito is working
5. If not → Check Cognito/SES configuration

### Automated Test:

Once manual test works, the MailSlurp test should work too (if SES is out of sandbox).

## Common Error Messages

### "No email received after 120 seconds"
- **Cause**: SES in sandbox mode, or email not configured
- **Solution**: Move out of sandbox or use Cognito default email

### "Email address not verified"
- **Cause**: SES sandbox mode
- **Solution**: Request production access

### "Daily email limit exceeded"
- **Cause**: Using Cognito default email (50/day limit)
- **Solution**: Wait until tomorrow or use SES

## Support

- **AWS SES Docs**: https://docs.aws.amazon.com/ses/
- **AWS Cognito Docs**: https://docs.aws.amazon.com/cognito/
- **SES Sandbox**: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
