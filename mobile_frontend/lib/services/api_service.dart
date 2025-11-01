import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:8081';

  /// Call this immediately after login to sync user with database
  static Future<Map<String, dynamic>> syncUserAfterLogin() async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;

      if (!cognitoSession.isSignedIn) {
        throw Exception('User is not signed in');
      }

      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      safePrint('=== Syncing User After Login ===');
      safePrint('URL: $baseUrl/api/v1/auth/sync');

      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/auth/sync'),
        headers: {
          'Authorization': 'Bearer $idToken',
          'Content-Type': 'application/json',
        },
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw Exception('Sync request timed out');
        },
      );

      safePrint('Sync Response Status: ${response.statusCode}');
      safePrint('Sync Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        safePrint('✓ User synced successfully to database');
        return data;
      } else {
        throw Exception('Failed to sync user: ${response.statusCode}');
      }
    } catch (e) {
      safePrint('✗ Error syncing user: $e');
      rethrow;
    }
  }

  /// Verify that JWT token is valid
  static Future<Map<String, dynamic>> verifyToken() async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;

      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/auth/verify'),
        headers: {
          'Authorization': 'Bearer $idToken',
          'Content-Type': 'application/json',
        },
      );

      safePrint('Token Verify Status: ${response.statusCode}');

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Token verification failed: ${response.statusCode}');
      }
    } catch (e) {
      safePrint('Error verifying token: $e');
      rethrow;
    }
  }

  /// Get user profile
  static Future<Map<String, dynamic>> getUserProfile() async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;

      if (!cognitoSession.isSignedIn) {
        throw Exception('User is not signed in');
      }

      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      safePrint('=== API Request Debug ===');
      safePrint('URL: $baseUrl/api/v1/me');
      safePrint('Token (first 20 chars): ${idToken.substring(0, 20)}...');

      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/me'),
        headers: {
          'Authorization': 'Bearer $idToken',
          'Content-Type': 'application/json',
        },
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw Exception('Request timed out - check if backend is running');
        },
      );

      safePrint('Response Status: ${response.statusCode}');
      safePrint('Response Body: ${response.body}');

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized - check backend JWT configuration');
      } else if (response.statusCode == 404) {
        throw Exception('Endpoint not found - check backend URL');
      } else {
        throw Exception('Failed to load profile: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      safePrint('Error fetching profile: $e');
      rethrow;
    }
  }

  /// Update user profile
  static Future<Map<String, dynamic>> updateUserProfile(
      Map<String, dynamic> updates) async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;

      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      final response = await http.patch(
        Uri.parse('$baseUrl/api/v1/me'),
        headers: {
          'Authorization': 'Bearer $idToken',
          'Content-Type': 'application/json',
        },
        body: json.encode(updates),
      );

      safePrint('Update Response Status: ${response.statusCode}');
      safePrint('Update Response Body: ${response.body}');

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to update profile: ${response.statusCode}');
      }
    } catch (e) {
      safePrint('Error updating profile: $e');
      rethrow;
    }
  }

  /// Toggle MFA (Multi-Factor Authentication)
  static Future<Map<String, dynamic>> toggleMfa(bool enabled) async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;

      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/me/mfa/toggle'),
        headers: {
          'Authorization': 'Bearer $idToken',
          'Content-Type': 'application/json',
        },
        body: json.encode({'enabled': enabled}),
      );

      safePrint('MFA Toggle Response Status: ${response.statusCode}');
      safePrint('MFA Toggle Response Body: ${response.body}');

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to toggle MFA: ${response.statusCode}');
      }
    } catch (e) {
      safePrint('Error toggling MFA: $e');
      rethrow;
    }
  }

  /// Get session info
  static Future<Map<String, dynamic>> getSessionInfo() async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;

      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/me/session'),
        headers: {
          'Authorization': 'Bearer $idToken',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to load session: ${response.statusCode}');
      }
    } catch (e) {
      safePrint('Error fetching session: $e');
      rethrow;
    }
  }

  /// Get tokens - useful for debugging
  static Future<Map<String, String>> getTokens() async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;

      final tokens = cognitoSession.userPoolTokensResult.value;

      return {
        'idToken': tokens.idToken.toJson(),
        'accessToken': tokens.accessToken.toJson(),
        'refreshToken': tokens.refreshToken ?? 'N/A',
      };
    } catch (e) {
      safePrint('Error fetching tokens: $e');
      rethrow;
    }
  }

  /// Test backend connectivity
  static Future<bool> testConnection() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/actuator/health'),
      ).timeout(const Duration(seconds: 5));
      
      safePrint('Backend Health Check: ${response.statusCode}');
      return response.statusCode == 200;
    } catch (e) {
      safePrint('Backend not reachable: $e');
      return false;
    }
  }

  /// Log logout event to backend
static Future<void> logoutUser() async {
  try {
    final result = await Amplify.Auth.fetchAuthSession();
    final cognitoSession = result as CognitoAuthSession;

    if (!cognitoSession.isSignedIn) {
      safePrint('User not signed in, skipping logout log');
      return;
    }

    final tokens = cognitoSession.userPoolTokensResult.value;
    final idToken = tokens.idToken.toJson();

    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/logout'),
      headers: {
        'Authorization': 'Bearer $idToken',
        'Content-Type': 'application/json',
      },
    ).timeout(
      const Duration(seconds: 5),
      onTimeout: () {
        throw Exception('Logout request timed out');
      },
    );

    safePrint('Logout Response Status: ${response.statusCode}');
    
    if (response.statusCode != 200) {
      throw Exception('Logout failed: ${response.statusCode}');
    }
  } catch (e) {
    safePrint('Error logging logout: $e');
    rethrow;
  }
}

/// Request password reset code
static Future<void> requestPasswordReset(String email) async {
  try {
    safePrint('Requesting password reset for: $email');
    
    await Amplify.Auth.resetPassword(
      username: email.trim(),
    );
    
    safePrint('✓ Password reset code sent to email');
  } catch (e) {
    safePrint('✗ Error requesting password reset: $e');
    rethrow;
  }
}

/// Confirm password reset with code
static Future<void> confirmPasswordReset({
  required String email,
  required String newPassword,
  required String confirmationCode,
}) async {
  try {
    safePrint('Confirming password reset for: $email');
    
    await Amplify.Auth.confirmResetPassword(
      username: email.trim(),
      newPassword: newPassword.trim(),
      confirmationCode: confirmationCode.trim(),
    );
    
    safePrint('✓ Password reset successful');
  } catch (e) {
    safePrint('✗ Error confirming password reset: $e');
    rethrow;
  }
}
}
