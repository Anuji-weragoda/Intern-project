import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_frontend/screens/signup_screen.dart';

void main() {
  testWidgets('SignUpScreen shows fields and signup button', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: SignUpScreen()));
  await tester.pumpAndSettle();

  expect(find.text('Create Account'), findsOneWidget);
  expect(find.byKey(const ValueKey('signup_email_input')), findsOneWidget);
  expect(find.byKey(const ValueKey('signup_password_input')), findsOneWidget);
  expect(find.byKey(const ValueKey('signup_confirm_password_input')), findsOneWidget);

  // Sign up button present (do not tap - would call Amplify)
  expect(find.byKey(const ValueKey('signup_button')), findsOneWidget);
  });
}
