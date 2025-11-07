import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'mfa_verification_screen.dart';
import 'totp_setup_screen.dart';
import 'dashboard_screen.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _codeController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _loading = false;
  bool _codeSent = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _signUp() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    try {
      final result = await Amplify.Auth.signUp(
        username: _emailController.text.trim(),
        password: _passwordController.text.trim(),
        options: SignUpOptions(
          userAttributes: {
            CognitoUserAttributeKey.email: _emailController.text.trim(),
          },
        ),
      );

      if (!result.isSignUpComplete && mounted) {
        setState(() => _codeSent = true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Verification code sent to your email!'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.message),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _confirmSignUp() async {
    if (_codeController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please enter verification code'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final result = await Amplify.Auth.confirmSignUp(
        username: _emailController.text.trim(),
        confirmationCode: _codeController.text.trim(),
      );

      if (result.isSignUpComplete && mounted) {
        // Auto sign-in to continue MFA/TOTP setup immediately
        try {
          final signInRes = await Amplify.Auth.signIn(
            username: _emailController.text.trim(),
            password: _passwordController.text.trim(),
          );
          safePrint('[Signup] auto sign-in nextStep: ${signInRes.nextStep.signInStep}');
          safePrint('[Signup] allowed MFA types: ${signInRes.nextStep.allowedMfaTypes}');

          if (signInRes.isSignedIn) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Sign up complete! Signed in.'),
                backgroundColor: Colors.green,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            );
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (_) => const DashboardScreen()),
            );
            return;
          }

          final step = signInRes.nextStep.signInStep;
          if (step == AuthSignInStep.confirmSignInWithSmsMfaCode ||
              step == AuthSignInStep.confirmSignInWithTotpMfaCode) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => MFAVerificationScreen(mfaStep: step),
              ),
            );
            return;
          } else if (step == AuthSignInStep.continueSignInWithTotpSetup) {
            // Explicitly call setupTotp to get secret
            safePrint('[Signup] continueSignInWithTotpSetup -> setupTotp()');
            final setupDetails = await Amplify.Auth.setUpTotp();
            final secret = setupDetails.sharedSecret;
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => TotpSetupScreen(
                  sharedSecret: secret,
                  username: _emailController.text.trim(),
                  issuer: 'StaffMS',
                ),
              ),
            );
            return;
          } else if (step == AuthSignInStep.continueSignInWithMfaSelection ||
              step.toString().contains('continueSignInWithMfaSetupSelection')) {
            safePrint('[Signup] MFA setup selection step detected.');
            // If secret already present in next step details, use it directly.
            if (signInRes.nextStep.totpSetupDetails != null) {
              final secret = signInRes.nextStep.totpSetupDetails!.sharedSecret;
              safePrint('[Signup] Using pre-provided TOTP secret (first 6): ${secret.substring(0, secret.length < 6 ? secret.length : 6)}...');
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => TotpSetupScreen(
                    sharedSecret: secret,
                    username: _emailController.text.trim(),
                    issuer: 'StaffMS',
                  ),
                ),
              );
              return;
            }
            // Otherwise attempt direct setUpTotp call.
            try {
              safePrint('[Signup] No secret provided; calling setUpTotp()');
              final setupDetails = await Amplify.Auth.setUpTotp();
              final secret = setupDetails.sharedSecret;
              safePrint('[Signup] setupTotp obtained secret (first 6): ${secret.substring(0, secret.length < 6 ? secret.length : 6)}...');
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => TotpSetupScreen(
                    sharedSecret: secret,
                    username: _emailController.text.trim(),
                    issuer: 'StaffMS',
                  ),
                ),
              );
              return;
            } catch (e) {
              safePrint('[Signup] Direct setUpTotp failed ($e); falling back to explicit selection');
              try {
                SignInResult selected;
                try {
                  selected = await Amplify.Auth.confirmSignIn(confirmationValue: 'SOFTWARE_TOKEN_MFA');
                } catch (_) {
                  selected = await Amplify.Auth.confirmSignIn(confirmationValue: 'totp');
                }
                final step2 = selected.nextStep.signInStep;
                safePrint('[Signup] after fallback selection nextStep: $step2');
                if (step2 == AuthSignInStep.continueSignInWithTotpSetup) {
                  final setupDetails2 = await Amplify.Auth.setUpTotp();
                  final secret2 = setupDetails2.sharedSecret;
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (_) => TotpSetupScreen(
                        sharedSecret: secret2,
                        username: _emailController.text.trim(),
                        issuer: 'StaffMS',
                      ),
                    ),
                  );
                  return;
                } else if (step2 == AuthSignInStep.confirmSignInWithTotpMfaCode ||
                    step2 == AuthSignInStep.confirmSignInWithSmsMfaCode) {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (_) => MFAVerificationScreen(mfaStep: step2),
                    ),
                  );
                  return;
                }
              } catch (e2) {
                safePrint('[Signup] MFA selection fallback failed: $e2');
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('MFA selection failed'),
                    backgroundColor: Colors.red,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                );
              }
              return;
            }
          }

          // Fallback
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Sign up complete. Continue to login.'),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
          Navigator.pop(context);
        } catch (e) {
          // If sign-in fails, go back to login screen as before
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Sign in after signup failed: $e'),
              backgroundColor: Colors.orange,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
          Navigator.pop(context);
        }
      }
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.message),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0F172A), // slate-900
              Color(0xFF1E3A8A), // blue-900
              Color(0xFF0F172A), // slate-900
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Back Button
                      Align(
                        alignment: Alignment.topLeft,
                        child: IconButton(
                          icon: const Icon(
                            Icons.arrow_back_ios,
                            color: Colors.white,
                          ),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Logo or App Icon
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Color(0xFF3B82F6), // blue-500
                              Color(0xFF4F46E5), // indigo-600
                            ],
                          ),
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF3B82F6).withOpacity(0.3),
                              blurRadius: 24,
                              offset: const Offset(0, 12),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Text(
                            'S',
                            style: TextStyle(
                              fontSize: 56,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Title
                      Text(
                        _codeSent ? 'Verify Email' : 'Create Account',
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _codeSent
                            ? 'Enter the code sent to your email'
                            : 'Sign up to get started',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.white.withOpacity(0.8),
                        ),
                      ),
                      const SizedBox(height: 50),

                      if (!_codeSent) ...[
                        // Email Field
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                blurRadius: 20,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: Semantics(
                              label: 'email_input',
                              child: TextFormField(
                                key: const ValueKey('signup_email_input'),
                                controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              style: const TextStyle(fontSize: 16),
                              decoration: const InputDecoration(
                                hintText: 'Enter your email',
                                prefixIcon: Icon(
                                  Icons.email_outlined,
                                  color: Color(0xFF3B82F6),
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.all(Radius.circular(16)),
                                  borderSide: BorderSide.none,
                                ),
                                filled: true,
                                fillColor: Colors.white,
                                contentPadding: EdgeInsets.all(20),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Please enter your email';
                                }
                                if (!value.contains('@')) {
                                  return 'Please enter a valid email';
                                }
                                return null;
                              },
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Password Field
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                blurRadius: 20,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                            child: Semantics(
                            label: 'password_input',
                            child: TextFormField(
                              key: const ValueKey('signup_password_input'),
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              style: const TextStyle(fontSize: 16),
                              decoration: InputDecoration(
                                hintText: 'Enter your password',
                                prefixIcon: const Icon(
                                  Icons.lock_outline,
                                  color: Color(0xFF3B82F6),
                                ),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                    color: Colors.grey,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
                                    });
                                  },
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide.none,
                                ),
                                filled: true,
                                fillColor: Colors.white,
                                contentPadding: const EdgeInsets.all(20),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Please enter a password';
                                }
                                if (value.length < 8) {
                                  return 'Password must be at least 8 characters';
                                }
                                return null;
                              },
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Confirm Password Field
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                blurRadius: 20,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                            child: Semantics(
                            label: 'confirm_password_input',
                            child: TextFormField(
                              key: const ValueKey('signup_confirm_password_input'),
                              controller: _confirmPasswordController,
                              obscureText: _obscureConfirmPassword,
                              style: const TextStyle(fontSize: 16),
                              decoration: InputDecoration(
                                hintText: 'Confirm your password',
                                prefixIcon: const Icon(
                                  Icons.lock_outline,
                                  color: Color(0xFF3B82F6),
                                ),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscureConfirmPassword
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                    color: Colors.grey,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _obscureConfirmPassword =
                                          !_obscureConfirmPassword;
                                    });
                                  },
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide.none,
                                ),
                                filled: true,
                                fillColor: Colors.white,
                                contentPadding: const EdgeInsets.all(20),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Please confirm your password';
                                }
                                if (value != _passwordController.text) {
                                  return 'Passwords do not match';
                                }
                                return null;
                              },
                            ),
                          ),
                        ),
                      ] else ...[
                        // Verification Code Field
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                blurRadius: 20,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: Semantics(
                            label: 'verification_code_input',
                            child: TextFormField(
                              controller: _codeController,
                              keyboardType: TextInputType.number,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 8,
                              ),
                              decoration: const InputDecoration(
                                hintText: 'Enter verification code',
                                prefixIcon: Icon(
                                  Icons.verified_user_outlined,
                                  color: Color(0xFF3B82F6),
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.all(Radius.circular(16)),
                                  borderSide: BorderSide.none,
                                ),
                                filled: true,
                                fillColor: Colors.white,
                                contentPadding: EdgeInsets.all(20),
                              ),
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 40),

                      // Action Button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                          child: Semantics(
                          label: _codeSent ? 'verify_button' : 'signup_button',
                          button: true,
                          child: ElevatedButton(
                            key: const ValueKey('signup_button'),
                            onPressed: _loading
                                ? null
                                : (_codeSent ? _confirmSignUp : _signUp),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF3B82F6), // blue-500
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 0,
                              shadowColor: const Color(0xFF3B82F6).withOpacity(0.5),
                            ),
                            child: _loading
                                ? const SizedBox(
                                    height: 24,
                                    width: 24,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2.5,
                                    ),
                                  )
                                : Text(
                                    _codeSent ? 'Verify & Complete' : 'Sign Up',
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 30),

                      // Already have account
                      if (!_codeSent)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Already have an account? ',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.8),
                                fontSize: 15,
                              ),
                            ),
                            GestureDetector(
                              onTap: () => Navigator.pop(context),
                              child: const Text(
                                'Login',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}