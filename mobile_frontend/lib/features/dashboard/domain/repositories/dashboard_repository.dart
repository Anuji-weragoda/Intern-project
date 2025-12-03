import '../entities/user_info.dart';
import '../entities/dashboard_stats.dart';

abstract class DashboardRepository {
  Future<UserInfo> getUserInfo();
  Future<DashboardStats> getDashboardStats();
  Future<void> signOut();
}