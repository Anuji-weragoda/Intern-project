// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_frontend/screens/login_screen.dart';

void main() {
  testWidgets('App shows login screen', (WidgetTester tester) async {
    // Build the LoginScreen directly; skip auth check to avoid network calls.
    await tester.pumpWidget(MaterialApp(home: LoginScreen(skipAuthCheck: true)));
    await tester.pumpAndSettle();

    // Basic assertions for login UI
    expect(find.text('Staff MS'), findsOneWidget);
    expect(find.byKey(const ValueKey('email_field')), findsOneWidget);
    expect(find.byKey(const ValueKey('password_field')), findsOneWidget);
  });
}
