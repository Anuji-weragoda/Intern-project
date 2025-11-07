import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_frontend/screens/login_screen.dart';
import 'package:mobile_frontend/screens/forgot_password_screen.dart';

void main() {
  testWidgets('LoginScreen renders and navigates to Forgot Password', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: LoginScreen(skipAuthCheck: true)));
  await tester.pumpAndSettle();

  // Basic UI elements
  expect(find.text('Staff MS'), findsOneWidget);
  // Login fields have ValueKeys in the source
  expect(find.byKey(const ValueKey('email_field')), findsOneWidget);
  expect(find.byKey(const ValueKey('password_field')), findsOneWidget);

  // Tap 'Forgot Password?' and verify navigation
  final forgotFinder = find.text('Forgot Password?');
  expect(forgotFinder, findsOneWidget);
  await tester.tap(forgotFinder);
  await tester.pumpAndSettle();

  // ForgotPasswordScreen should be visible
  expect(find.byType(ForgotPasswordScreen), findsOneWidget);
  expect(find.text('Reset Password'), findsOneWidget);
  });
}
