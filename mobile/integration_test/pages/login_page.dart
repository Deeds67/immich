import 'package:flutter/material.dart';
import 'package:patrol/patrol.dart';

import '../common/test_app.dart';

/// Page object for the Immich login screen.
class LoginPage {
  final PatrolIntegrationTester $;

  const LoginPage(this.$);

  /// Wait for the login screen to be visible.
  Future<void> waitForScreen() async {
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

  /// Enter the server URL, email, and password.
  Future<void> enterCredentials({String? server, String? email, String? password}) async {
    final loginForms = $(TextFormField);

    // The login form has 3 fields: email (0), password (1), server URL (2)
    if (email != null) {
      await loginForms.at(0).enterText(email);
    }
    if (password != null) {
      await loginForms.at(1).enterText(password);
    }
    if (server != null) {
      await loginForms.at(2).enterText(server);
    }
  }

  /// Enter the default test credentials.
  Future<void> enterTestCredentials() async {
    await enterCredentials(server: testServerUrl, email: testEmail, password: testPassword);
  }

  /// Tap the login button.
  Future<void> tapLogin() async {
    await $(ElevatedButton).tap();
  }

  /// Full login flow with default test credentials.
  Future<void> loginWithTestCredentials() async {
    await waitForScreen();
    await acknowledgeNewServerVersionIfPresent();
    await enterTestCredentials();
    await tapLogin();
  }
}
