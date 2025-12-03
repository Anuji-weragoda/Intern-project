import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/di/injection_container.dart';
import '../cubit/dashboard_cubit.dart';
import '../cubit/dashboard_state.dart';
import '../../../../screens/login_screen.dart';

class DashboardPage extends StatelessWidget {
	const DashboardPage({super.key});

	@override
	Widget build(BuildContext context) {
		return BlocProvider(
			create: (_) => sl<DashboardCubit>()..loadDashboard(),
			child: BlocListener<DashboardCubit, DashboardState>(
				listener: (context, state) {
					if (state is DashboardSignedOut) {
						Navigator.of(context).pushAndRemoveUntil(
							MaterialPageRoute(builder: (_) => const LoginScreen()),
							(route) => false,
						);
					}
				},
				child: Scaffold(
					backgroundColor: const Color(0xFFF8FAFC),
					body: SafeArea(
						child: BlocBuilder<DashboardCubit, DashboardState>(
							builder: (context, state) {
								if (state is DashboardLoading || state is DashboardInitial) {
									return const Center(child: CircularProgressIndicator());
								}

								if (state is DashboardError) {
									return Center(
										child: Column(
											mainAxisSize: MainAxisSize.min,
											children: [
												Text('Error: ${state.message}'),
												const SizedBox(height: 12),
												ElevatedButton(
													onPressed: () => context.read<DashboardCubit>().loadDashboard(),
													child: const Text('Retry'),
												),
											],
										),
									);
								}

								if (state is DashboardLoaded) {
									final name = state.userInfo.displayName ?? state.userInfo.email ?? 'User';
									final hours = state.stats.hoursToday.toStringAsFixed(2);

									return RefreshIndicator(
										onRefresh: () => context.read<DashboardCubit>().loadDashboard(),
										color: const Color(0xFF6366F1),
										child: CustomScrollView(
											physics: const BouncingScrollPhysics(),
											slivers: [
												SliverToBoxAdapter(
													child: Padding(
														padding: const EdgeInsets.all(20),
														child: Row(
															mainAxisAlignment: MainAxisAlignment.spaceBetween,
															children: [
																Column(
																	crossAxisAlignment: CrossAxisAlignment.start,
																	children: [
																		const Text('Good day,', style: TextStyle(color: Colors.grey)),
																		const SizedBox(height: 6),
																		Text(name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
																	],
																),
																IconButton(
																	onPressed: () => context.read<DashboardCubit>().signOut(),
																	icon: const Icon(Icons.logout_rounded),
																),
															],
														),
													),
												),
												SliverToBoxAdapter(
													child: Padding(
														padding: const EdgeInsets.symmetric(horizontal: 20),
														child: Container(
															padding: const EdgeInsets.all(20),
															decoration: BoxDecoration(
																color: Colors.white,
																borderRadius: BorderRadius.circular(16),
																boxShadow: [
																	BoxShadow(color: Colors.black.withAlpha(10), blurRadius: 12, offset: const Offset(0, 4)),
																],
															),
															child: Row(
																children: [
																	Container(
																		padding: const EdgeInsets.all(12),
																		decoration: BoxDecoration(color: const Color(0xFFF59E0B), borderRadius: BorderRadius.circular(12)),
																		child: const Icon(Icons.access_time_rounded, color: Colors.white),
																	),
																	const SizedBox(width: 12),
																	Column(
																		crossAxisAlignment: CrossAxisAlignment.start,
																		children: [
																			Text('$hours h', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
																			const SizedBox(height: 4),
																			const Text('Hours Today', style: TextStyle(color: Colors.grey)),
																		],
																	),
																],
															),
														),
													),
												),
											],
										),
									);
								}

								return const SizedBox.shrink();
							},
						),
					),
				),
			),
		);
	}
}
