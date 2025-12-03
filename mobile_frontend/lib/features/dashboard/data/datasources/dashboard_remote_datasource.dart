import 'package:amplify_flutter/amplify_flutter.dart';
import '../../../../services/api_service.dart';
import '../models/user_info_model.dart';
import '../models/dashboard_stats_model.dart';

abstract class DashboardRemoteDataSource {
  Future<UserInfoModel> getUserInfo();
  Future<DashboardStatsModel> getDashboardStats();
  Future<void> signOut();
}

class DashboardRemoteDataSourceImpl implements DashboardRemoteDataSource {
  @override
  Future<UserInfoModel> getUserInfo() async {
    try {
      // Get email from Amplify
      String? email;
      final attributes = await Amplify.Auth.fetchUserAttributes();
      for (var attribute in attributes) {
        if (attribute.userAttributeKey.key == 'email') {
          email = attribute.value;
          break;
        }
      }

      // Get profile from API
      final profile = await ApiService.getUserProfile();
      
      return UserInfoModel(
        email: email,
        displayName: profile['displayName'] ?? profile['username'],
      );
    } catch (e) {
      throw Exception('Failed to load user info: $e');
    }
  }

  @override
  Future<DashboardStatsModel> getDashboardStats() async {
    try {
      final items = await ApiService.getMyAttendance(limit: 1000);
      
      final now = DateTime.now();
      final startLocal = DateTime(now.year, now.month, now.day);
      final endLocal = startLocal.add(const Duration(days: 1));
      double total = 0.0;

      for (final r in items) {
        try {
          String? inTs = r['clock_in'] ?? r['clockIn'];
          String? outTs = r['clock_out'] ?? r['clockOut'];
          String? createdAtTs = r['created_at'] ?? r['createdAt'];
          String? updatedAtTs = r['updated_at'] ?? r['updatedAt'];

          DateTime? tryParse(String? s) {
            if (s == null) return null;
            try {
              final normalized = s.replaceFirst(' ', 'T');
              final dt = DateTime.tryParse(normalized);
              if (dt != null) return dt.toLocal();
            } catch (_) {}
            return null;
          }

          final inDate = tryParse(inTs) ?? tryParse(createdAtTs);
          DateTime? outDate = tryParse(outTs) ?? tryParse(updatedAtTs);
          outDate ??= DateTime.now().toLocal();

          if (inDate != null) {
            final overlapStart = inDate.isAfter(startLocal) ? inDate : startLocal;
            final overlapEnd = outDate.isBefore(endLocal) ? outDate : endLocal;
            if (overlapEnd.isAfter(overlapStart)) {
              final diffHours = overlapEnd.difference(overlapStart).inMilliseconds / (1000 * 60 * 60);
              if (diffHours.isFinite && diffHours > 0) total += diffHours;
            }
          } else {
            final created = tryParse(createdAtTs);
            if (created != null && !created.isBefore(startLocal) && created.isBefore(endLocal)) {
              dynamic th = r['total_hours'] ?? r['totalHours'];
              if (th != null) {
                final parsed = double.tryParse(th.toString());
                if (parsed != null) {
                  total += parsed;
                  continue;
                }
              }
              dynamic tm = r['total_minutes'] ?? r['totalMinutes'] ?? r['duration_minutes'] ?? r['durationMinutes'];
              if (tm != null) {
                final parsedM = double.tryParse(tm.toString());
                if (parsedM != null) {
                  total += parsedM / 60.0;
                  continue;
                }
              }
            }
          }
        } catch (e) {
          safePrint('Error parsing attendance row: $e');
        }
      }

      return DashboardStatsModel(hoursToday: double.parse(total.toStringAsFixed(2)));
    } catch (e) {
      throw Exception('Failed to load dashboard stats: $e');
    }
  }

  @override
  Future<void> signOut() async {
    try {
      await ApiService.logoutUser();
    } catch (e) {
      safePrint('Logout API error (continuing): $e');
    }

    try {
      await Amplify.Auth.signOut();
    } catch (e) {
      throw Exception('Sign out failed: $e');
    }
  }
}