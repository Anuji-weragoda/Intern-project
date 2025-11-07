import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_frontend/screens/totp_setup_screen.dart';

void main() {
  testWidgets('TotpSetupScreen renders QR and code field when secret present', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: TotpSetupScreen(
        sharedSecret: 'TESTSECRET123',
        username: 'user@example.com',
      ),
    ));
    await tester.pumpAndSettle();

    // Header text
    expect(find.text('Set Up Authenticator'), findsOneWidget);

    // QR widget (QrImageView renders a CustomPaint)
    expect(find.byType(CustomPaint), findsWidgets);

    // Code field & verify button
    expect(find.byKey(const ValueKey('totp_code_field')), findsOneWidget);
    expect(find.byKey(const ValueKey('totp_verify_button')), findsOneWidget);
  });

  testWidgets('TotpSetupScreen shows error text when secret missing', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: TotpSetupScreen(
        sharedSecret: null,
        username: 'user@example.com',
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.textContaining('Missing TOTP secret'), findsOneWidget);
    // No code field
    expect(find.byKey(const ValueKey('totp_code_field')), findsNothing);
  });
}
