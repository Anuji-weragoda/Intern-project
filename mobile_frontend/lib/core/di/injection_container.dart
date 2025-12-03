// lib/core/di/injection_container.dart

import 'package:get_it/get_it.dart';
import '../../features/dashboard/data/datasources/dashboard_remote_datasource.dart';
import '../../features/dashboard/data/repositories/dashboard_repository_impl.dart';
import '../../features/dashboard/domain/repositories/dashboard_repository.dart';
import '../../features/dashboard/presentation/cubit/dashboard_cubit.dart';

final sl = GetIt.instance; // Service Locator

Future<void> init() async {
  //! Features - Dashboard
  // Cubit
  sl.registerFactory(
    () => DashboardCubit(sl()),
  );

  // Repository
  sl.registerLazySingleton<DashboardRepository>(
    () => DashboardRepositoryImpl(sl()),
  );

  // Data sources
  sl.registerLazySingleton<DashboardRemoteDataSource>(
    () => DashboardRemoteDataSourceImpl(),
  );

  // Add more feature registrations here as you refactor them
  // Example:
  // //! Features - Auth
  // sl.registerFactory(() => AuthCubit(sl()));
  // sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(sl()));
}