import 'dart:convert';
import 'dart:io';

import '../common/test_app.dart';

/// Seeds the test Immich server with initial data for integration tests.
class TestDataSeeder {
  String? _accessToken;

  /// Run the full seed sequence.
  Future<void> seed() async {
    await _signUpAdmin();
    await _login();
  }

  /// Sign up the admin user (first-time setup).
  Future<void> _signUpAdmin() async {
    final client = HttpClient();
    try {
      final request = await client.postUrl(
        Uri.parse('$testServerUrl/api/auth/admin-sign-up'),
      );
      request.headers.set('Content-Type', 'application/json');
      request.write(jsonEncode({
        'name': 'Test Admin',
        'email': testEmail,
        'password': testPassword,
      }));
      final response = await request.close();
      // 201 = created, 400 = already exists — both are fine
      await response.drain();
    } finally {
      client.close();
    }
  }

  /// Log in and store the access token.
  Future<void> _login() async {
    final client = HttpClient();
    try {
      final request = await client.postUrl(
        Uri.parse('$testServerUrl/api/auth/login'),
      );
      request.headers.set('Content-Type', 'application/json');
      request.write(jsonEncode({
        'email': testEmail,
        'password': testPassword,
      }));
      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();
      final json = jsonDecode(body) as Map<String, dynamic>;
      _accessToken = json['accessToken'] as String;
    } finally {
      client.close();
    }
  }

  /// Get the access token (must call [seed] first).
  String get accessToken {
    if (_accessToken == null) {
      throw StateError('Must call seed() before accessing token');
    }
    return _accessToken!;
  }
}
