import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/api_service.dart';
import 'dashboard_screen.dart';

/// Screen shown when Cognito requires TOTP setup during sign in.
/// Expects a shared secret returned from the sign-in nextStep.
class TotpSetupScreen extends StatefulWidget {
  final String? sharedSecret;
  final String username; // for building otpauth URL
  final String issuer;

  const TotpSetupScreen({
    super.key,
    required this.sharedSecret,
    required this.username,
    this.issuer = 'StaffMS',
  });

  @override
  State<TotpSetupScreen> createState() => _TotpSetupScreenState();
}

class _TotpSetupScreenState extends State<TotpSetupScreen> {
  final _codeController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _verifying = false;
  bool _showSecret = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  String _buildOtpauthUrl() {
    final secret = widget.sharedSecret;
    if (secret == null || secret.isEmpty) return '';
    // Standard otpauth URI format
    return 'otpauth://totp/${Uri.encodeComponent(widget.issuer)}:${Uri.encodeComponent(widget.username)}?secret=$secret&issuer=${Uri.encodeComponent(widget.issuer)}&algorithm=SHA1&digits=6&period=30';
  }

  Future<void> _confirmTotpSetup() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _verifying = true);
    try {
      final result = await Amplify.Auth.confirmSignIn(
        confirmationValue: _codeController.text.trim(),
      );

      if (result.isSignedIn && mounted) {
        safePrint('✓ TOTP setup + sign in complete');
        // Sync with backend
        try {
          await ApiService.syncUserAfterLogin();
        } catch (e) {
          safePrint('Backend sync failed (continuing): $e');
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('TOTP configured successfully!'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardScreen()),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Verification failed. Try again.'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.message}'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final secret = widget.sharedSecret;
    final otpauthUrl = _buildOtpauthUrl();
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F172A), Color(0xFF1E3A8A), Color(0xFF0F172A)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Icon / Header
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFF3B82F6), Color(0xFF4F46E5)],
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
                        child: Icon(Icons.qr_code_2, size: 56, color: Colors.white),
                      ),
                    ),
                    const SizedBox(height: 32),
                    const Text(
                      'Set Up Authenticator',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      secret == null || secret.isEmpty
                          ? 'Missing TOTP secret. Please retry sign in.'
                          : 'Scan the QR code in Google Authenticator / Authy then enter the first 6-digit code to finish setup.',
                      style: TextStyle(
                        fontSize: 16,
                        color: const Color(0xFFA5B4FC).withOpacity(0.8),
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    // Step 1: Install
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '1. Install',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Install an authenticator app on your device (Google Authenticator, Authy, etc.)',
                        style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 14),
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Step 2: Scan QR
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '2. Scan QR code',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (secret != null && secret.isNotEmpty && otpauthUrl.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.15),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: QrImageView(
                          data: otpauthUrl,
                          version: QrVersions.auto,
                          size: 200,
                          backgroundColor: Colors.white,
                        ),
                      ),
                    if (secret != null && secret.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton(
                          onPressed: () => setState(() => _showSecret = !_showSecret),
                          child: Text(_showSecret ? 'Hide secret key' : 'Show secret key'),
                        ),
                      ),
                      if (_showSecret)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Expanded(
                                child: SelectableText(
                                  secret,
                                  style: const TextStyle(
                                    fontFamily: 'monospace',
                                    fontSize: 16,
                                    letterSpacing: 1.2,
                                    color: Colors.black87,
                                  ),
                                ),
                              ),
                              IconButton(
                                tooltip: 'Copy secret',
                                icon: const Icon(Icons.copy, color: Colors.black87),
                                onPressed: () async {
                                  await Clipboard.setData(ClipboardData(text: secret));
                                  if (!mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: const Text('Secret key copied'),
                                      behavior: SnackBarBehavior.floating,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                  );
                                },
                              )
                            ],
                          ),
                        ),
                    ],
                    if (secret != null && secret.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '3. Enter code',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.9),
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),
                      // Code field
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
                        child: TextFormField(
                          key: const ValueKey('totp_code_field'),
                          controller: _codeController,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
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
                            if (value == null || value.isEmpty) return 'Enter code';
                              if (!RegExp(r'^\d{6}$').hasMatch(value)) return '6 digits';
                            return null;
                          },
                          onFieldSubmitted: (_) { if (!_verifying) _confirmTotpSetup(); },
                        ),
                      ),
                      const SizedBox(height: 30),
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          key: const ValueKey('totp_verify_button'),
                          onPressed: _verifying ? null : _confirmTotpSetup,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF3B82F6),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            elevation: 0,
                          ),
                          child: _verifying
                              ? const SizedBox(
                                  height: 24,
                                  width: 24,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                                )
                              : const Text('Verify & Finish', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Back', style: TextStyle(color: Colors.white, fontSize: 16)),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
