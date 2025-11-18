import 'dart:async';
import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  bool _loading = true;
  bool _actionInProgress = false;
  List<dynamic> _rows = [];
  Map<String, dynamic>? _activeSession;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _loadAttendance();
    // update active duration every second when clocked in
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_activeSession != null && mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _loadAttendance() async {
    setState(() {
      _loading = true;
    });

    try {
      // Try to fetch attendance rows from ApiService. If the method name differs,
      // adjust to the project's ApiService implementation.
      final dynamic resp = await ApiService.getMyAttendance();
      List<dynamic> rows = [];

      if (resp is List) {
        rows = resp;
      } else if (resp is Map && resp['data'] is List) {
        rows = List<dynamic>.from(resp['data']);
      } else if (resp == null) {
        rows = [];
      } else {
        // Fallback: try to coerce a single-item map into a list
        try {
          rows = [resp];
        } catch (_) {
          rows = [];
        }
      }

      // find active session manually to avoid type issues with firstWhere/orElse
      Map<String, dynamic>? active;
      for (final row in rows) {
        try {
          final outTs = row['clock_out'] ?? row['clockOut'] ?? row['clock_out_at'] ?? row['clock_out_time'];
          if (outTs == null) {
            active = row as Map<String, dynamic>?;
            break;
          }
        } catch (_) {
          // ignore malformed rows
        }
      }

      if (mounted) {
        setState(() {
          _rows = rows;
          _activeSession = active;
        });
      }
    } catch (e) {
      safePrint('Error loading attendance: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load attendance: ${e.toString()}'),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _clockIn() async {
    setState(() => _actionInProgress = true);
    try {
      await ApiService.clockIn();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 8),
                Text('Clocked in successfully'),
              ],
            ),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        await _loadAttendance();
      }
    } catch (e) {
      safePrint('Error clocking in: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to clock in: ${e.toString()}'),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actionInProgress = false);
    }
  }

  Future<void> _clockOut() async {
    setState(() => _actionInProgress = true);
    try {
      await ApiService.clockOut();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 8),
                Text('Clocked out successfully'),
              ],
            ),
            backgroundColor: AppColors.primary,
            behavior: SnackBarBehavior.floating,
          ),
        );
        await _loadAttendance();
      }
    } catch (e) {
      safePrint('Error clocking out: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to clock out: ${e.toString()}'),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actionInProgress = false);
    }
  }

  String _formatTime(dynamic timestamp) {
    if (timestamp == null) return '--:--';
    try {
      final dt = DateTime.parse(timestamp.toString()).toUtc().toLocal();
      final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final minute = dt.minute.toString().padLeft(2, '0');
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      return '$hour:$minute $period';
    } catch (e) {
      return '--:--';
    }
  }

  String _formatDate(dynamic timestamp) {
    if (timestamp == null) return '';
    try {
      final dt = DateTime.parse(timestamp.toString()).toUtc().toLocal();
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return '${weekdays[dt.weekday - 1]}, ${months[dt.month - 1]} ${dt.day}';
    } catch (e) {
      return '';
    }
  }

  String _calculateDuration(dynamic clockIn, dynamic clockOut) {
    if (clockIn == null) return '---';
    try {
      final inTime = DateTime.parse(clockIn.toString()).toUtc().toLocal();
      final outTime = clockOut != null ? DateTime.parse(clockOut.toString()).toUtc().toLocal() : DateTime.now();
      final duration = outTime.difference(inTime);
      final hours = duration.inHours;
      final minutes = duration.inMinutes.remainder(60);
      return '${hours}h ${minutes}m';
    } catch (e) {
      return '---';
    }
  }

  Map<String, List<dynamic>> _groupByDate() {
    final grouped = <String, List<dynamic>>{};
    for (final row in _rows) {
      final inTs = row['clock_in'] ?? row['clockIn'] ?? row['clock_in_at'] ?? row['clock_in_time'];
      final dateKey = _formatDate(inTs);
      if (dateKey.isNotEmpty) grouped.putIfAbsent(dateKey, () => []).add(row);
    }
    return grouped;
  }

  @override
  Widget build(BuildContext context) {
    final groupedData = _groupByDate();
    final sortedDates = groupedData.keys.toList()
      ..sort((a, b) {
        try {
          final dateA = groupedData[a]!.first['clock_in'] ?? groupedData[a]!.first['clockIn'];
          final dateB = groupedData[b]!.first['clock_in'] ?? groupedData[b]!.first['clockIn'];
          return DateTime.parse(dateB.toString()).compareTo(DateTime.parse(dateA.toString()));
        } catch (e) {
          return 0;
        }
      });

    final bool isClockedIn = _activeSession != null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: const Color.fromARGB(255, 249, 250, 252),
        foregroundColor: const Color.fromARGB(255, 8, 0, 0),
        title: const Text('My Attendance', style: TextStyle(fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadAttendance,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isClockedIn ? [AppColors.primary, AppColors.secondary] : [AppColors.primary, AppColors.primaryVariant],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(color: Colors.black.withAlpha((0.1 * 255).round()), blurRadius: 8, offset: const Offset(0, 4)),
              ],
            ),
            child: Column(
              children: [
                if (isClockedIn) ...[
                  const Icon(Icons.work_rounded, size: 48, color: Colors.white),
                  const SizedBox(height: 12),
                  const Text('You are clocked in', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  Text('Since ${_formatTime(_activeSession?['clock_in'] ?? _activeSession?['clockIn'])}', style: const TextStyle(fontSize: 14, color: Colors.white70)),
                  const SizedBox(height: 4),
                  Text(_calculateDuration(_activeSession?['clock_in'] ?? _activeSession?['clockIn'], null), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
                ] else ...[
                  const Icon(Icons.schedule_rounded, size: 48, color: Colors.white),
                  const SizedBox(height: 12),
                  const Text('Ready to start your day?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  Text(DateTime.now().hour < 12 ? 'Good morning!' : DateTime.now().hour < 18 ? 'Good afternoon!' : 'Good evening!', style: const TextStyle(fontSize: 14, color: Colors.white70)),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton.icon(
                    onPressed: _actionInProgress ? null : (isClockedIn ? _clockOut : _clockIn),
                    icon: _actionInProgress
                        ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(AppColors.secondary)))
                        : Icon(isClockedIn ? Icons.logout_rounded : Icons.login_rounded, size: 24),
                    label: Text(_actionInProgress ? 'Processing...' : (isClockedIn ? 'Clock Out' : 'Clock In'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: isClockedIn ? AppColors.danger : AppColors.secondary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Attendance History
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _rows.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.schedule_rounded, size: 80, color: AppColors.textSecondary),
                            const SizedBox(height: 16),
                            Text('No Attendance Records', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                            const SizedBox(height: 8),
                            Text('Clock in to start tracking your attendance', style: TextStyle(fontSize: 14, color: AppColors.textSecondary.withAlpha((0.8 * 255).round()))),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadAttendance,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: sortedDates.length,
                          itemBuilder: (context, index) {
                            final dateKey = sortedDates[index];
                            final records = groupedData[dateKey]!;

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: EdgeInsets.only(left: 4, bottom: 12, top: index == 0 ? 0 : 8),
                                  child: Text(dateKey, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                ),
                                ...records.map((r) {
                                  final inTs = r['clock_in'] ?? r['clockIn'] ?? r['clock_in_at'] ?? r['clock_in_time'];
                                  final outTs = r['clock_out'] ?? r['clockOut'] ?? r['clock_out_at'] ?? r['clock_out_time'];
                                  final note = r['note'] ?? '';
                                  final duration = _calculateDuration(inTs, outTs);
                                  final isActive = outTs == null;

                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    decoration: BoxDecoration(
                                      color: AppColors.surface,
                                      borderRadius: BorderRadius.circular(16),
                                      border: isActive ? Border.all(color: AppColors.success.withAlpha((0.22 * 255).round()), width: 2) : null,
                                      boxShadow: [BoxShadow(color: Colors.black.withAlpha((0.05 * 255).round()), blurRadius: 10, offset: const Offset(0, 4))],
                                    ),
                                    child: Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Row(
                                                  children: [
                                                    Container(
                                                      padding: const EdgeInsets.all(8),
                                                      decoration: BoxDecoration(color: AppColors.success.withAlpha((0.06 * 255).round()), borderRadius: BorderRadius.circular(8)),
                                                      child: Icon(Icons.login_rounded, size: 20, color: AppColors.success),
                                                    ),
                                                    const SizedBox(width: 12),
                                                    Column(
                                                      crossAxisAlignment: CrossAxisAlignment.start,
                                                      children: [
                                                        Text('Clock In', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                                        const SizedBox(height: 2),
                                                        Text(_formatTime(inTs), style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              Container(width: 1, height: 40, color: AppColors.textSecondary.withAlpha((0.25 * 255).round())),
                                              Expanded(
                                                child: Row(
                                                  children: [
                                                    const SizedBox(width: 12),
                                                    Container(
                                                      padding: const EdgeInsets.all(8),
                                                      decoration: BoxDecoration(color: isActive ? AppColors.warning.withAlpha((0.06 * 255).round()) : AppColors.danger.withAlpha((0.06 * 255).round()), borderRadius: BorderRadius.circular(8)),
                                                      child: Icon(Icons.logout_rounded, size: 20, color: isActive ? AppColors.warning : AppColors.danger),
                                                    ),
                                                    const SizedBox(width: 12),
                                                    Column(
                                                      crossAxisAlignment: CrossAxisAlignment.start,
                                                      children: [
                                                        Text('Clock Out', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                                        const SizedBox(height: 2),
                                                        Text(_formatTime(outTs), style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: isActive ? AppColors.warning : AppColors.textPrimary)),
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 12),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                            decoration: BoxDecoration(color: isActive ? AppColors.success.withAlpha((0.06 * 255).round()) : AppColors.primary.withAlpha((0.06 * 255).round()), borderRadius: BorderRadius.circular(8)),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(isActive ? Icons.access_time_rounded : Icons.timer_rounded, size: 16, color: isActive ? AppColors.success : AppColors.primary),
                                                const SizedBox(width: 6),
                                                Text(duration, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isActive ? AppColors.success : AppColors.primary)),
                                              ],
                                            ),
                                          ),
                                          if (note.isNotEmpty) ...[
                                            const SizedBox(height: 12),
                                            Container(
                                              padding: const EdgeInsets.all(10),
                                              decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8)),
                                              child: Row(
                                                children: [
                                                  Icon(Icons.notes_rounded, size: 16, color: AppColors.textSecondary),
                                                  const SizedBox(width: 8),
                                                  Expanded(child: Text(note, style: TextStyle(fontSize: 13, color: AppColors.textSecondary))),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  );
                                }),
                              ],
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}