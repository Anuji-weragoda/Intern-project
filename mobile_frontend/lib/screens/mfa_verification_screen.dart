import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import '../services/api_service.dart';
import 'dashboard_screen.dart';

class MFAVerificationScreen extends StatefulWidget {
  final AuthSignInStep mfaStep;

  const MFAVerificationScreen({super.key, required this.mfaStep});

  @override
  State<MFAVerificationScreen> createState() => _MFAVerificationScreenState();
}

class _MFAVerificationScreenState extends State<MFAVerificationScreen> {
  final _codeController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _verifying = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  // MFA Verification Logic
  Future<void> _verifyCode() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _verifying = true);

    try {
      final result = await Amplify.Auth.confirmSignIn(
        confirmationValue: _codeController.text.trim(),
      );

      if (!mounted) return;

      if (result.isSignedIn) {
        safePrint('✓ MFA verification successful');

        // Sync user with backend database
        safePrint('Syncing user with backend...');
        try {
          await ApiService.syncUserAfterLogin();
          safePrint('✓ Backend sync successful');
        } catch (syncError) {
          safePrint('⚠ Backend sync failed: $syncError');
          // Continue anyway - user is authenticated with Cognito
        }

        if (!mounted) return;

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('MFA verification successful!'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );

        // Navigate to dashboard
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardScreen()),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Verification failed. Please try again.'),
            backgroundColor: Colors.red,
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
            content: Text('Verification failed: ${e.message}'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('An unexpected error occurred: $e'),
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
        setState(() => _verifying = false);
      }
    }
  }

  String _getMfaLabel() {
    switch (widget.mfaStep) {
      case AuthSignInStep.confirmSignInWithSmsMfaCode:
        return 'Enter the 6-digit code sent to your phone';
      case AuthSignInStep.confirmSignInWithTotpMfaCode:
        return 'Enter the 6-digit code from your authenticator app';
      default:
        return 'Enter the 6-digit verification code';
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
                      // Icon
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
                          child: Icon(
                            Icons.verified_user,
                            size: 56,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Title
                      const Text(
                        'Two-Factor Authentication',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _getMfaLabel(),
                          style: TextStyle(
                          fontSize: 16,
                          color: Color(0xFFA5B4FC).withAlpha(204),
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 48),

                      // Code Field
                      Semantics(
                        label: 'mfa_input',
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
                            key: const ValueKey('mfa_code_field'),
                            controller: _codeController,
                            keyboardType: TextInputType.number,
                            textInputAction: TextInputAction.done,
                            maxLength: 6,
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center,
                            decoration: const InputDecoration(
                              hintText: '000000',
                              counterText: '',
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
                                return 'Please enter the verification code';
                              }
                              if (value.length != 6) {
                                return 'Code must be 6 digits';
                              }
                              if (!RegExp(r'^\d{6}$').hasMatch(value)) {
                                return 'Code must contain only digits';
                              }
                              return null;
                            },
                            onFieldSubmitted: (_) {
                              if (!_verifying) {
                                _verifyCode();
                              }
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 30),

                      // Verify Button
                      Semantics(
                        label: 'mfa_verify_button',
                        child: SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: ElevatedButton(
                              key: const ValueKey('mfa_verify_button'),
                              onPressed: _verifying ? null : _verifyCode,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF3B82F6),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 0,
                              shadowColor: Color(0xFF3B82F6).withAlpha(128),
                            ),
                            child: _verifying
                                ? const SizedBox(
                                    height: 24,
                                    width: 24,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2.5,
                                    ),
                                  )
                                : Text(
                                    'Verify Code',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: Color(0xFFA5B4FC).withAlpha(204),
                                    ),
                                  ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Back to Login
                      TextButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                        },
                                child: const Text(
                                  'Back to Login',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                  ),
                                ),
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