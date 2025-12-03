import '../../domain/repositories/dashboard_repository.dart';
import '../../domain/entities/user_info.dart';
import '../../domain/entities/dashboard_stats.dart';
import '../datasources/dashboard_remote_datasource.dart';

class DashboardRepositoryImpl implements DashboardRepository {
  final DashboardRemoteDataSource remoteDataSource;

  DashboardRepositoryImpl(this.remoteDataSource);

  @override
  Future<UserInfo> getUserInfo() async {
    final model = await remoteDataSource.getUserInfo();
    return model;
  }

  @override
  Future<DashboardStats> getDashboardStats() async {
    final model = await remoteDataSource.getDashboardStats();
    return model;
  }

  @override
  Future<void> signOut() async {
    return remoteDataSource.signOut();
  }
}
