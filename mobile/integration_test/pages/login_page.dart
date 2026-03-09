import 'package:flutter/material.dart';
import 'package:patrol/patrol.dart';

import '../common/test_app.dart';

/// Page object for the Immich login screen.
///
/// The login flow has two phases:
///   Phase 1: Server URL entry → tap "Next"
///   Phase 2: Email/password entry → tap "Login"
class LoginPage {
  final PatrolIntegrationTester $;

  const LoginPage(this.$);

  // --- Phase 1: Server URL ---

  /// Wait for the server URL screen (phase 1) to be visible.
  Future<void> waitForServerUrlScreen() async {
    // The server URL screen has a "Next" button
    await $('Next').waitUntilVisible();
  }

  /// Enter the server URL and proceed to the credentials screen.
  Future<void> enterServerUrl(String url) async {
    await waitForServerUrlScreen();
    // Phase 1 has a single TextFormField for the server URL
    await $(TextFormField).first.enterText(url);
    // Tap the "Next" button (ElevatedButton in the ImmichForm)
    await $(ElevatedButton).first.tap();
  }

  // --- Phase 2: Credentials ---

  /// Wait for the credentials screen (phase 2) to be visible.
  /// This is the screen with "Login" button after server URL is validated.
  Future<void> waitForCredentialsScreen() async {
    await $('Login').waitUntilVisible();
  }

  /// Acknowledge the new server version dialog if it appears.
  Future<void> acknowledgeNewServerVersionIfPresent() async {
    try {
      final ack = $('Acknowledge');
      if (ack.exists) {
        await ack.tap();
      }
    } on Exception {
      // Dialog not present, continue
    }
  }

  /// Enter email and password on the credentials screen (phase 2).
  Future<void> enterCredentials({required String email, required String password}) async {
    final fields = $(TextFormField);
    // Phase 2 has two TextFormFields: email (0) and password (1)
    await fields.at(0).enterText(email);
    await fields.at(1).enterText(password);
  }

  /// Tap the login button on the credentials screen.
  Future<void> tapLogin() async {
    // Find the ElevatedButton that contains "Login" text
    await $(ElevatedButton).first.tap();
  }

  /// Full login flow with default test credentials.
  Future<void> loginWithTestCredentials() async {
    await enterServerUrl(testServerUrl);
    await waitForCredentialsScreen();
    await acknowledgeNewServerVersionIfPresent();
    await enterCredentials(email: testEmail, password: testPassword);
    await tapLogin();
  }
}
