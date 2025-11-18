import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import '../services/api_service.dart';
import 'signup_screen.dart';
import 'dashboard_screen.dart';
import 'forgot_password_screen.dart';
import 'mfa_verification_screen.dart';
import 'totp_setup_screen.dart';

class LoginScreen extends StatefulWidget {
  final bool skipAuthCheck;

  const LoginScreen({super.key, this.skipAuthCheck = false});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  final _formKey = GlobalKey<FormState>();

  bool _loading = false;
  bool _obscurePassword = true;
  bool _signing = false; // extra guard to prevent double submit

  @override
  void initState() {
    super.initState();
    if (!widget.skipAuthCheck) {
      _checkAuthStatus();
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  Future<void> _checkAuthStatus() async {
    try {
      final session = await Amplify.Auth.fetchAuthSession();
      if (session.isSignedIn && mounted) {
        // User is already signed in, sync with backend and navigate to dashboard
        safePrint('User already signed in, syncing with backend...');
        await ApiService.syncUserAfterLogin();
        
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
          );
        }
      }
    } catch (e) {
      safePrint('Not signed in or sync failed: $e');
    }
  }

  Future<void> _signIn() async {
    // Dismiss keyboard to avoid IME show/hide jank during navigation
    FocusScope.of(context).unfocus();
    if (_signing || _loading) return;
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _signing = true;
    });

    try {
      // Step 1: Sign in with Cognito
      safePrint('=== Starting Login Process ===');
      final result = await Amplify.Auth.signIn(
        username: _emailController.text.trim(),
        password: _passwordController.text.trim(),
      );
      if (!mounted) return;
      safePrint('[Login] initial signIn nextStep: ${result.nextStep.signInStep}');
      safePrint('[Login] allowed MFA types: ${result.nextStep.allowedMfaTypes}');
      safePrint('[Login] has totpSetupDetails? ${result.nextStep.totpSetupDetails != null}');

      // Check if MFA is required or additional steps are needed
      if (!result.isSignedIn) {
        final step = result.nextStep.signInStep;
        if (step == AuthSignInStep.confirmSignInWithSmsMfaCode ||
            step == AuthSignInStep.confirmSignInWithTotpMfaCode) {
          if (mounted) {
            // Navigate to MFA verification screen
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => MFAVerificationScreen(mfaStep: step),
              ),
            );
          }
          return;
        } else if (step == AuthSignInStep.continueSignInWithMfaSelection ||
            step.toString().contains('continueSignInWithMfaSetupSelection')) {
          // Newer Cognito may already include TOTP setup details here.
          safePrint('[Login] MFA setup selection step detected.');
          if (result.nextStep.totpSetupDetails != null) {
            final secret = result.nextStep.totpSetupDetails!.sharedSecret;
            safePrint('[Login] Using pre-provided TOTP secret (first 6): ${secret.substring(0, secret.length < 6 ? secret.length : 6)}...');
            final username = _emailController.text.trim();
            if (mounted) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => TotpSetupScreen(
                    sharedSecret: secret,
                    username: username,
                    issuer: 'StaffMS',
                  ),
                ),
              );
            }
            return;
          }
          // Otherwise attempt to call setUpTotp directly.
          try {
            safePrint('[Login] No secret in nextStep; calling setUpTotp()');
            final setupDetails = await Amplify.Auth.setUpTotp();
            final secret = setupDetails.sharedSecret;
            safePrint('[Login] setupTotp obtained secret (first 6): ${secret.substring(0, secret.length < 6 ? secret.length : 6)}...');
            final username = _emailController.text.trim();
            if (mounted) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => TotpSetupScreen(
                    sharedSecret: secret,
                    username: username,
                    issuer: 'StaffMS',
                  ),
                ),
              );
            }
            return;
          } catch (e) {
            safePrint('[Login] Direct setUpTotp failed ($e); falling back to explicit selection via confirmSignIn');
            try {
              SignInResult selectRes;
              try {
                selectRes = await Amplify.Auth.confirmSignIn(confirmationValue: 'SOFTWARE_TOKEN_MFA');
              } catch (_) {
                selectRes = await Amplify.Auth.confirmSignIn(confirmationValue: 'totp');
              }
              safePrint('[Login] after fallback selection step: ${selectRes.nextStep.signInStep}');
              if (selectRes.nextStep.signInStep == AuthSignInStep.continueSignInWithTotpSetup) {
                final setupDetails2 = await Amplify.Auth.setUpTotp();
                final secret2 = setupDetails2.sharedSecret;
                safePrint('[Login] setupTotp obtained secret (first 6): ${secret2.substring(0, secret2.length < 6 ? secret2.length : 6)}...');
                final username = _emailController.text.trim();
                if (mounted) {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (_) => TotpSetupScreen(
                        sharedSecret: secret2,
                        username: username,
                        issuer: 'StaffMS',
                      ),
                    ),
                  );
                }
                return;
              } else if (selectRes.nextStep.signInStep == AuthSignInStep.confirmSignInWithTotpMfaCode ||
                  selectRes.nextStep.signInStep == AuthSignInStep.confirmSignInWithSmsMfaCode) {
                if (mounted) {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (_) => MFAVerificationScreen(mfaStep: selectRes.nextStep.signInStep),
                    ),
                  );
                }
                return;
              }
            } catch (e2) {
              safePrint('[Login] MFA selection fallback failed: $e2');
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: const Text('MFA selection failed'), backgroundColor: Colors.red),
                );
              }
            }
            return;
          }
        } else if (step == AuthSignInStep.continueSignInWithTotpSetup) {
          // Need to explicitly call setUpTotp() to obtain secret
          safePrint('[Login] continueSignInWithTotpSetup -> calling setUpTotp()');
          try {
            final setupDetails = await Amplify.Auth.setUpTotp();
            safePrint('[Login] setupTotp secret length: ${setupDetails.sharedSecret.length}');
            final sharedSecret = setupDetails.sharedSecret;
          final username = _emailController.text.trim();
          if (mounted) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => TotpSetupScreen(
                  sharedSecret: sharedSecret,
                  username: username,
                  issuer: 'StaffMS',
                ),
              ),
            );
          }
          return;
          } catch (e) {
            safePrint('[Login] setUpTotp failed: $e');
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: const Text('TOTP setup failed'), backgroundColor: Colors.red),
              );
            }
            return;
          }
        } else {
          // Other steps not handled, show error
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Additional sign-in step required but not supported.'),
                backgroundColor: Colors.orange,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            );
          }
          return;
        }
      }

      // If signed in (no MFA required)
        if (result.isSignedIn && mounted) {
        safePrint('✓ Cognito authentication successful');

        // Step 2: Sync user with backend database
        safePrint('Syncing user with backend...');
        try {
          await ApiService.syncUserAfterLogin();
          if (!mounted) return;
          safePrint('✓ Backend sync successful');
        } catch (syncError) {
          safePrint('⚠ Backend sync failed: $syncError');
          // Continue anyway - user is authenticated with Cognito
        }

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Successfully signed in!'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );

        // Step 3: Navigate to dashboard screen
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardScreen()),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Sign in not complete.'),
            backgroundColor: Colors.orange,
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
      if (mounted) {
        setState(() {
          _loading = false;
          _signing = false;
        });
      } else {
        _loading = false;
        _signing = false;
      }
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
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
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
                              color: Color(0xFF3B82F6).withAlpha(77),
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

                      // Welcome Text
                      const Text(
                        'Staff MS',
                        style: TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Sign in to continue',
                        style: TextStyle(
                          fontSize: 18,
                          color: Color(0xFFA5B4FC).withAlpha(204), // indigo-300
                        ),
                      ),
                      const SizedBox(height: 48),

                      // Email Field
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(26),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Semantics(
                          label: 'email_input',
                          child: TextFormField(
                            key: const ValueKey('email_field'),
                            controller: _emailController,
                            focusNode: _emailFocus,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            enableSuggestions: false,
                            autocorrect: false,
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
                      Semantics(
                        label: 'password_input',
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withAlpha(26),
                                blurRadius: 20,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: TextFormField(
                            key: const ValueKey('password_field'),
                            controller: _passwordController,
                            focusNode: _passwordFocus,
                            obscureText: _obscurePassword,
                            textInputAction: TextInputAction.done,
                            onFieldSubmitted: (_) {
                              if (!_loading && !_signing) {
                                _signIn();
                              }
                            },
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
                              border: const OutlineInputBorder(
                                borderRadius: BorderRadius.all(Radius.circular(16)),
                                borderSide: BorderSide.none,
                              ),
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.all(20),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please enter your password';
                              }
                              if (value.length < 6) {
                                return 'Password must be at least 6 characters';
                              }
                              return null;
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Forgot Password
                      // Forgot Password
                    Align(
                      alignment: Alignment.centerRight,
                      child: Semantics(
                        label: 'login_forgot_password',
                        button: true,
                        child: TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const ForgotPasswordScreen(),
                              ),
                            );
                          },
                          child: const Text(
                            'Forgot Password?',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    ),
                      const SizedBox(height: 30),

                      // Login Button
                      Semantics(
                        label: 'login_button',
                        child: SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: ElevatedButton(
                            onPressed: _loading ? null : _signIn,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF3B82F6), // blue-500
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 0,
                              shadowColor: Color(0xFF3B82F6).withAlpha(128),
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
                                : const Text(
                                    'Sign In',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 30),

                      // Sign Up Link
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            "Don't have an account? ",
                            style: TextStyle(
                              color: Colors.white.withAlpha(204),
                              fontSize: 15,
                            ),
                          ),
                          Semantics(
                            label: 'signup_nav_button',
                            button: true,
                            child: GestureDetector(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const SignUpScreen(),
                                  ),
                                );
                              },
                              child: const Text(
                                'Sign Up',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  decoration: TextDecoration.underline,
                                ),
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