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
  // Show secret by default to improve automated test reliability (Appium needs it immediately).
  // If you want to hide by default in production, flip this to false or gate with a const bool.fromEnvironment.
  bool _showSecret = true;

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
        if (!mounted) return;
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
      resizeToAvoidBottomInset: true,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F172A), Color(0xFF1E3A8A), Color(0xFF0F172A)],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (ctx, constraints) {
              return SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                padding: EdgeInsets.only(
                  left: 32,
                  right: 32,
                  // Keep extra bottom space above keyboard so button never gets hidden
                  bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
                  top: 12,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight - (MediaQuery.of(ctx).viewInsets.bottom),
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.start,
                      crossAxisAlignment: CrossAxisAlignment.center,
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
                            color: Color(0xFF3B82F6).withAlpha(77),
                            blurRadius: 24,
                            offset: const Offset(0, 12),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(Icons.qr_code_2, size: 56, color: Colors.white),
                      ),
                    ),
                    const SizedBox(height: 28),
                    const Text(
                      'Set Up Authenticator',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      secret == null || secret.isEmpty
                          ? 'Missing TOTP secret. Please retry sign in.'
                          : 'Scan the QR code in Google Authenticator / Authy then enter the first 6-digit code to finish setup.',
                      style: TextStyle(
                        fontSize: 16,
                        color: Color(0xFFA5B4FC).withAlpha(204),
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    // Step 1: Install
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '1. Install',
                        style: TextStyle(
                          color: Colors.white.withAlpha(230),
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
                        style: TextStyle(color: Colors.white.withAlpha(217), fontSize: 14),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Step 2: Scan QR
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '2. Scan QR code',
                        style: TextStyle(
                          color: Colors.white.withAlpha(230),
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
                              color: Colors.black.withAlpha(38),
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
                      // Wrap the TextButton with ExcludeSemantics so parent Semantics label becomes the content-desc.
                      // Semantics node for automation: ensure it's a container + button so Android exposes a stable content-desc.
                      Semantics(
                        label: 'totp_show_secret_button',
                        button: true,
                        container: true,
                        // Expose current state as value so tests can differentiate hide vs show without relying on text.
                        value: _showSecret ? 'visible' : 'hidden',
                        child: ExcludeSemantics(
                          excluding: true,
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton(
                              onPressed: () => setState(() => _showSecret = !_showSecret),
                              child: Text(_showSecret ? 'Hide secret key' : 'Show secret key'),
                            ),
                          ),
                        ),
                      ),
                      // Fallback invisible semantics node (always present) to allow scrollIntoView even if button text changes.
                      Offstage(
                        offstage: true,
                        child: Semantics(
                          label: 'totp_show_secret_button_fallback',
                          button: true,
                          value: _showSecret ? 'visible' : 'hidden',
                          child: const SizedBox.shrink(),
                        ),
                      ),
                      if (_showSecret)
                        Semantics(
                          label: 'totp_secret_container',
                          child: Container(
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
                                  child: Semantics(
                                    label: 'totp_secret_value', // accessibility id for Appium
                                    value: secret, // expose the actual secret via contentDescription value
                                    readOnly: true,
                                    child: ExcludeSemantics(
                                      excluding: false,
                                      child: SelectableText(
                                        secret,
                                        key: const ValueKey('totp_secret_value'),
                                        style: const TextStyle(
                                          fontFamily: 'monospace',
                                          fontSize: 16,
                                          letterSpacing: 1.2,
                                          color: Colors.black87,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                Semantics(
                                  label: 'totp_copy_secret_button',
                                  button: true,
                                  child: IconButton(
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
                                  ),
                                )
                              ],
                            ),
                          ),
                        ),
                      // Provide an offstage semantics node for automation fallback even when secret hidden.
                      if (!_showSecret)
                        Offstage(
                          offstage: false,
                          child: Semantics(
                            label: 'totp_secret_value_offstage',
                            value: secret,
                            child: const SizedBox.shrink(),
                          ),
                        ),
                      // Always-present static semantics containing the secret for automation extraction
                      // Keep offstage=false so the semantics node is exposed to accessibility tree
                      Offstage(
                        offstage: false,
                        child: Semantics(
                          label: 'totp_secret_value_static',
                          value: secret,
                          child: const SizedBox.shrink(),
                        ),
                      ),
                    ],
                    if (secret != null && secret.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '3. Enter code',
                          style: TextStyle(
                            color: Colors.white.withAlpha(230),
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      // Code field (with semantics label for Appium)
                      Semantics(
                        label: 'totp_code_field',
                        textField: true,
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
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            autofocus: true,
                            validator: (value) {
                              if (value == null || value.isEmpty) return 'Enter code';
                              if (!RegExp(r'^\d{6}$').hasMatch(value)) return '6 digits';
                              return null;
                            },
                            onFieldSubmitted: (_) { if (!_verifying) _confirmTotpSetup(); },
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Semantics(
                        label: 'totp_verify_button',
                        button: true,
                        child: SizedBox(
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
              );
            },
          ),
        ),
      ),
    );
  }
}
