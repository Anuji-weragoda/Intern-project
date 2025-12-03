import 'package:flutter_bloc/flutter_bloc.dart';
import 'dashboard_state.dart';
import '../../domain/repositories/dashboard_repository.dart';

class DashboardCubit extends Cubit<DashboardState> {
  final DashboardRepository repository;

  DashboardCubit(this.repository) : super(DashboardInitial());

  Future<void> loadDashboard() async {
    emit(DashboardLoading());
    try {
      final userInfo = await repository.getUserInfo();
      final stats = await repository.getDashboardStats();
      emit(DashboardLoaded(userInfo: userInfo, stats: stats));
    } catch (e) {
      emit(DashboardError(e.toString()));
    }
  }

  Future<void> signOut() async {
    emit(DashboardSigningOut());
    try {
      await repository.signOut();
      emit(DashboardSignedOut());
    } catch (e) {
      emit(DashboardError(e.toString()));
    }
  }
}
