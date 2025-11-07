import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_frontend/screens/dashboard_screen.dart';

void main() {
  testWidgets('Dashboard renders and sign out dialog can be cancelled', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: DashboardScreen(skipLoadUserInfo: true)),
    ));
    // Allow any initial frames/animations to settle
    await tester.pumpAndSettle();

  // Allow debug output of the widget tree to diagnose test failures
  debugDumpApp();

  // Basic UI elements — check a couple of visible menu texts
  expect(find.text('My Profile'), findsOneWidget);
  expect(find.text('Sign Out'), findsOneWidget);

    // Sign out button exists and opens dialog
  final signOutFinder = find.bySemanticsLabel('sign_out_button');
  expect(signOutFinder, findsOneWidget);

  // Ensure button is visible (may be in a scrollable area) then tap
  await tester.ensureVisible(signOutFinder);
  await tester.tap(signOutFinder);
    await tester.pumpAndSettle();

  // Dialog shown with the confirmation text and cancel/confirm actions
  expect(find.text('Are you sure you want to sign out?'), findsOneWidget);
  expect(find.bySemanticsLabel('cancel_signout_button'), findsOneWidget);
  expect(find.bySemanticsLabel('confirm_signout_button'), findsOneWidget);

  // Cancel the dialog to avoid performing network actions
  await tester.tap(find.bySemanticsLabel('cancel_signout_button'));
  await tester.pumpAndSettle();

  // Dialog should be dismissed
  expect(find.widgetWithText(AlertDialog, 'Sign Out'), findsNothing);
  });
}
