import '../../domain/entities/dashboard_stats.dart';

class DashboardStatsModel extends DashboardStats {
  const DashboardStatsModel({
    required super.hoursToday,
  });

  factory DashboardStatsModel.fromCalculation(double hours) {
    return DashboardStatsModel(hoursToday: hours);
  }
}