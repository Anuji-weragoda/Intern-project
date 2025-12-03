import 'package:equatable/equatable.dart';

class DashboardStats extends Equatable {
  final double hoursToday;

  const DashboardStats({
    required this.hoursToday,
  });

  @override
  List<Object?> get props => [hoursToday];
}