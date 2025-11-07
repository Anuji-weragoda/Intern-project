# mobile_frontend

Flutter application for the Staff Management System mobile experience.

## Contents
1. Overview
2. Architecture & Packages
3. Authentication (Cognito + Amplify) & MFA/TOTP Flow
4. Local Development & Running
5. Appium UI Testing
6. Troubleshooting
7. Future Enhancements

---
## 1. Overview
The app provides secure sign in, profile management, dashboard access and multi-factor authentication (MFA) via SMS or authenticator (TOTP) backed by Amazon Cognito using Amplify.

## 2. Architecture & Packages
Key dependencies (see `pubspec.yaml`):
- `amplify_flutter`, `amplify_auth_cognito`: Cognito auth & step-based sign-in.
- `qr_flutter`: Generates QR for TOTP provisioning.
- `flutter_secure_storage`: Secure local storage (tokens/secrets if needed).
- `http`: Backend REST calls via `ApiService`.

Screens of note:
- `login_screen.dart`, `signup_screen.dart` – primary auth entry points.
- `totp_setup_screen.dart` – shows QR + secret and confirms first code.
- `mfa_verification_screen.dart` – generic 6‑digit code entry (SMS or TOTP after setup).
- `settings_screen.dart` – manual TOTP initiation and MFA enable/disable.
- `profile_screen.dart` – user profile & sign out.

## 3. Authentication & MFA/TOTP Flow
Cognito may require multiple steps during `Amplify.Auth.signIn()`. The app inspects `SignInResult.nextStep.signInStep` and branches accordingly.

### Sign-in steps handled
| Cognito Step | Meaning | App Action |
|--------------|---------|-----------|
| `confirmSignInWithSmsMfaCode` | SMS factor required | Navigate to `MFAVerificationScreen` |
| `confirmSignInWithTotpMfaCode` | TOTP factor required (already configured) | Navigate to `MFAVerificationScreen` |
| `continueSignInWithMfaSelection` | User must choose MFA type | Acquire or initiate TOTP setup -> `TotpSetupScreen` |
| `continueSignInWithMfaSetupSelection` (variant) | Some pools return this extended enum for selection/setup | Treated same as above |
| `continueSignInWithTotpSetup` | Start authenticator setup; need secret | Call `Amplify.Auth.setUpTotp()` and show `TotpSetupScreen` |

### Obtaining the TOTP secret
The secret may appear in `result.nextStep.totpSetupDetails.sharedSecret` when the selection step is returned. If not present we call `Amplify.Auth.setUpTotp()` to retrieve it. As a defensive fallback the app attempts legacy selection via `confirmSignIn('SOFTWARE_TOKEN_MFA')` or `'totp'` when direct setup fails (older Cognito behavior).

### Generating the QR code
In `TotpSetupScreen` we build an otpauth URL:
```
otpauth://totp/<ISSUER>:<USER>?secret=<SECRET>&issuer=<ISSUER>&algorithm=SHA1&digits=6&period=30
```
Rendered using `QrImageView`. User can also view/copy raw secret.

### Confirming setup
User enters the first 6‑digit code; we call `Amplify.Auth.confirmSignIn(confirmationValue: code)`. On success we sync with backend (`ApiService.syncUserAfterLogin()`) and navigate to the dashboard.

### Required Cognito User Pool Settings
Minimum recommended for mandatory TOTP:
- MFA: Required.
- Enabled MFA types: Software token (and optionally SMS).
- Email verification required (signup sends code).
- Allow TOTP (software token) in pool settings.

### Handling Variant Enum Names
Some Amplify versions/pools surface `continueSignInWithMfaSetupSelection` which is not in older documentation. We match via `step.toString().contains('MfaSetupSelection')` to stay resilient.

### Common Failure Modes
| Symptom | Likely Cause | Resolution |
|---------|--------------|-----------|
| "Additional sign-in step required but not supported" | Missing branch for a new/variant step | Update conditional to include variant enum or new step |
| No QR / secret shown | Secret not in nextStep and `setUpTotp()` not invoked | Ensure selection branch calls `setUpTotp()` when `totpSetupDetails` is null |
| `InvalidParameterException` on signup auto sign-in | Attempted to pass selection using a 6‑digit code or unsupported plugin options | Remove unsupported plugin options; perform proper TOTP setup retrieval |
| Endless MFA loop | Failing to call `confirmSignIn` with code after entering TOTP | Verify code submission path hits `confirmSignIn()` |

## 4. Local Development
1. Install Amplify CLI & configure backend environment (Cognito user pool, etc.).
2. Run `flutter pub get`.
3. Add/amplify configuration files (not included here) and call `Amplify.configure()` early in app bootstrap.
4. Run app: `flutter run` (Android emulator / iOS simulator / device).

## 5. Appium UI Testing
High-level recap:
- Start an emulator/device (`adb devices`).
- Launch Appium server (`npx appium`).
- Execute test runner; include capabilities JSON similar to:
```json
{
  "platformName": "Android",
  "automationName": "UiAutomator2",
  "deviceName": "Pixel_4_API_31",
  "app": "C:\\path\\to\\app-debug.apk",
  "appPackage": "com.example.app",
  "appActivity": "com.example.app.MainActivity",
  "noReset": false
}
```
Best practices: Page Objects, explicit waits, secure secret management, parallelization via cloud/device farm when scaling.

## 6. Troubleshooting
- Ensure user pool changes (MFA required, token types) are deployed before testing new users.
- If QR still does not appear add logging: `safePrint(result.nextStep.signInStep)` and `safePrint(result.nextStep.totpSetupDetails?.sharedSecret.length)`.
- Clear local state by signing out and creating a brand new user for setup tests.
- Verify system clock accuracy (TOTP codes depend on time sync).

## 7. Future Enhancements
- Unify MFA verification screen text & rename for clarity.
- Replace deprecated `withOpacity()` usages with `withValues()`.
- Add integration tests covering full TOTP enrollment.

---
General Flutter references:
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook samples](https://docs.flutter.dev/cookbook)

