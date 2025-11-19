import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import '../config/api_gateway.dart';

class ApiService {
  
  static const String baseUrl = String.fromEnvironment('AUTH_BASE_URL', defaultValue: 'http://10.0.2.2:8081');
 
  static const String leaveBaseUrl = String.fromEnvironment('LEAVE_BASE_URL', defaultValue: '');
  
  static String effectiveLeaveBase() {
 
    if (generatedApiGatewayUrl.isNotEmpty) return generatedApiGatewayUrl;
    if (leaveBaseUrl.isNotEmpty) return leaveBaseUrl;
    final msg = 'No leave service URL configured. Ensure lib/config/api_gateway.dart contains the deployed ApiUrl or pass --dart-define=LEAVE_BASE_URL=<url> when running.';
    safePrint(msg);
    throw Exception(msg);
  }


  static String? _getSubFromIdToken(String idToken) {
    try {
      final parts = idToken.split('.');
      if (parts.length < 2) return null;
      var payload = parts[1];
      final mod = payload.length % 4;
      if (mod != 0) payload = payload + '=' * (4 - mod);
      final decoded = utf8.decode(base64Url.decode(payload));
      final Map<String, dynamic> map = json.decode(decoded);
      return map['sub']?.toString();
    } catch (e) {
      safePrint('Failed to extract sub from id token: $e');
      return null;
    }
  }

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
        'refreshToken': tokens.refreshToken,
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

  /// Get leave requests for the currently logged in user
  static Future<List<dynamic>> getMyLeaves({int limit = 50}) async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;
      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      final uri = Uri.parse('${effectiveLeaveBase()}/api/v1/leave/requests?limit=$limit&mine=true');
      safePrint('ApiService.getMyLeaves -> $uri');
      final headers = {
        'Authorization': 'Bearer $idToken',
        'Content-Type': 'application/json',
      };
      http.Response response;
      response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 10));
      // removed stray legacy code

      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        // Expect array or { items: [] }
        if (body is List) return body;
        return (body['items'] ?? body['data'] ?? body['requests'] ?? []) as List<dynamic>;
      } else {
        throw Exception('Failed to load leaves: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      safePrint('Error fetching my leaves: $e');
      rethrow;
    }
  }

  /// Create a new leave request for the logged-in user
  static Future<Map<String, dynamic>> createLeaveRequest(Map<String, dynamic> payload) async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;
      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      final uri = Uri.parse('${effectiveLeaveBase()}/api/v1/leave/requests');
      safePrint('ApiService.createLeaveRequest -> $uri');
      final headers = {
        'Authorization': 'Bearer $idToken',
        'Content-Type': 'application/json',
      };
      http.Response response;
      response = await http.post(uri, headers: headers, body: json.encode(payload)).timeout(const Duration(seconds: 10));
      // removed stray legacy code

      if (response.statusCode == 201 || response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception('Failed to create leave: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      safePrint('Error creating leave request: $e');
      rethrow;
    }
  }

  /// Cancel a leave request by id (issues a PATCH with action='cancel')
  static Future<void> cancelLeaveRequest(dynamic id) async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;
      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      final uri = Uri.parse('${effectiveLeaveBase()}/api/v1/leave/requests/$id');
      safePrint('ApiService.cancelLeaveRequest -> $uri');
      final response = await http.patch(uri,
          headers: {
            'Authorization': 'Bearer $idToken',
            'Content-Type': 'application/json',
          },
          body: json.encode({'action': 'cancel'})).timeout(const Duration(seconds: 10));

      safePrint('Cancel leave response: ${response.statusCode} - ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 204) {
        return;
      } else {
        throw Exception('Failed to cancel leave: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      safePrint('Error cancelling leave request: $e');
      rethrow;
    }
  }

  /// Get attendance logs for the current user
  static Future<List<dynamic>> getMyAttendance({int limit = 100}) async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;
      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      final uri = Uri.parse('${effectiveLeaveBase()}/api/attendance?limit=$limit&mine=true');
      safePrint('ApiService.getMyAttendance -> $uri');
      final headers = {
        'Authorization': 'Bearer $idToken',
        'Content-Type': 'application/json',
      };
      http.Response response;
      response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 10));
      // removed stray legacy code

      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        if (body is List) return body;
        return (body['items'] ?? body['data'] ?? body['rows'] ?? []) as List<dynamic>;
      } else {
        throw Exception('Failed to load attendance: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      safePrint('Error fetching attendance: $e');
      rethrow;
    }
  }

  /// Get leave balance for the current user
  static Future<double> getMyLeaveBalance() async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;
      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      final uri = Uri.parse('${effectiveLeaveBase()}/api/v1/leave/balance');
      safePrint('ApiService.getMyLeaveBalance -> $uri');
      final headers = {
        'Authorization': 'Bearer $idToken',
        'Content-Type': 'application/json',
      };
      final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 10));

      safePrint('getMyLeaveBalance response: ${response.statusCode} - ${response.body}');

      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        // Expect numeric balance or object with `balance`/`available` field
        if (body is num) return body.toDouble();
        if (body is Map) {
          final val = body['balance'] ?? body['available'] ?? body['remaining'] ?? body['leave_balance'];
          if (val is num) return val.toDouble();
          final parsed = double.tryParse(val?.toString() ?? '');
          if (parsed != null) return parsed;
        }
        throw Exception('Unexpected leave balance payload');
      } else {
        throw Exception('Failed to load leave balance: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      safePrint('Error fetching leave balance: $e');
      rethrow;
    }
  }

  /// Clock in for the current user (optionally include geo/method)
  static Future<Map<String, dynamic>> clockIn({Map<String, dynamic>? body}) async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;
      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      // Try to extract the user's sub (UUID) from the id token and include it in the body
      final userSub = _getSubFromIdToken(idToken);
      final sendBody = Map<String, dynamic>.from(body ?? {});
      if (userSub != null && (sendBody['user_id'] == null || sendBody['user_id'].toString().isEmpty)) {
        sendBody['user_id'] = userSub;
      }

      final uri = Uri.parse('${effectiveLeaveBase()}/api/attendance/clock-in');
      safePrint('ApiService.clockIn -> $uri');
      safePrint('Attendance sendBody (clockIn): ${json.encode(sendBody)}');
      final response = await http.post(uri, headers: {
        'Authorization': 'Bearer $idToken',
        'Content-Type': 'application/json',
      }, body: json.encode(sendBody)).timeout(const Duration(seconds: 10));

      safePrint('Attendance response (clockIn): ${response.statusCode} - ${response.body}');

      if (response.statusCode == 201 || response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception('Failed to clock in: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      safePrint('Error clocking in: $e');
      rethrow;
    }
  }

  /// Clock out for the current user
  static Future<Map<String, dynamic>> clockOut({Map<String, dynamic>? body}) async {
    try {
      final result = await Amplify.Auth.fetchAuthSession();
      final cognitoSession = result as CognitoAuthSession;
      final tokens = cognitoSession.userPoolTokensResult.value;
      final idToken = tokens.idToken.toJson();

      // Include authenticated user's sub in the body to satisfy backend validation
      final userSub = _getSubFromIdToken(idToken);
      final sendBody = Map<String, dynamic>.from(body ?? {});
      if (userSub != null && (sendBody['user_id'] == null || sendBody['user_id'].toString().isEmpty)) {
        sendBody['user_id'] = userSub;
      }

      final uri = Uri.parse('${effectiveLeaveBase()}/api/attendance/clock-out');
      safePrint('ApiService.clockOut -> $uri');
      safePrint('Attendance sendBody (clockOut): ${json.encode(sendBody)}');
      final response = await http.post(uri, headers: {
        'Authorization': 'Bearer $idToken',
        'Content-Type': 'application/json',
      }, body: json.encode(sendBody)).timeout(const Duration(seconds: 10));

      safePrint('Attendance response (clockOut): ${response.statusCode} - ${response.body}');

      if (response.statusCode == 201 || response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception('Failed to clock out: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      safePrint('Error clocking out: $e');
      rethrow;
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
