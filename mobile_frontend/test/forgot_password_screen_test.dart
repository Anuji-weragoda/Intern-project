import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_frontend/screens/forgot_password_screen.dart';

void main() {
  testWidgets('ForgotPasswordScreen shows email input and send button', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: ForgotPasswordScreen()));
  await tester.pumpAndSettle();

  expect(find.text('Reset Password'), findsOneWidget);
  // Use ValueKey-based finders which are stable in tests
  expect(find.byKey(const ValueKey('fp_email_input')), findsOneWidget);
  expect(find.byKey(const ValueKey('fp_action_button_send')), findsOneWidget);

    // Do not press the send button (would call ApiService)
  });
}
