import 'package:equatable/equatable.dart';
import '../../domain/entities/user_info.dart';
import '../../domain/entities/dashboard_stats.dart';

abstract class DashboardState extends Equatable {
  const DashboardState();

  @override
  List<Object?> get props => [];
}

class DashboardInitial extends DashboardState {}

class DashboardLoading extends DashboardState {}

class DashboardLoaded extends DashboardState {
  final UserInfo userInfo;
  final DashboardStats stats;

  const DashboardLoaded({
    required this.userInfo,
    required this.stats,
  });

  @override
  List<Object?> get props => [userInfo, stats];

  DashboardLoaded copyWith({
    UserInfo? userInfo,
    DashboardStats? stats,
  }) {
    return DashboardLoaded(
      userInfo: userInfo ?? this.userInfo,
      stats: stats ?? this.stats,
    );
  }
}

class DashboardError extends DashboardState {
  final String message;

  const DashboardError(this.message);

  @override
  List<Object?> get props => [message];
}

class DashboardSigningOut extends DashboardState {}

class DashboardSignedOut extends DashboardState {}