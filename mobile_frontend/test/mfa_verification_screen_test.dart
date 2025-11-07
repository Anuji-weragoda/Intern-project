import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:mobile_frontend/screens/mfa_verification_screen.dart';

void main() {
  testWidgets('MFAVerificationScreen shows correct label and input', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: MFAVerificationScreen(mfaStep: AuthSignInStep.confirmSignInWithSmsMfaCode),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Two-Factor Authentication'), findsOneWidget);
    // find by ValueKey for the code field and button
    expect(find.byKey(const ValueKey('mfa_code_field')), findsOneWidget);
    expect(find.byKey(const ValueKey('mfa_verify_button')), findsOneWidget);

    // The helper text according to the step should be visible
    expect(find.textContaining('sent to your phone'), findsOneWidget);
  });
}
