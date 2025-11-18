import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import '../services/api_service.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  bool _loading = true;
  List<dynamic> _rows = [];

  @override
  void initState() {
    super.initState();
    _loadAttendance();
  }

  Future<void> _loadAttendance() async {
    setState(() => _loading = true);
    try {
      final r = await ApiService.getMyAttendance();
      if (mounted) setState(() => _rows = r);
    } catch (e) {
      safePrint('Error loading attendance: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load attendance: ${e.toString()}'),
            backgroundColor: Colors.red.shade400,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _formatTime(dynamic timestamp) {
    if (timestamp == null) return '--:--';
    try {
      final dt = DateTime.parse(timestamp.toString());
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
      final dt = DateTime.parse(timestamp.toString());
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return '${weekdays[dt.weekday - 1]}, ${months[dt.month - 1]} ${dt.day}';
    } catch (e) {
      return '';
    }
  }

  String _calculateDuration(dynamic clockIn, dynamic clockOut) {
    if (clockIn == null || clockOut == null) return 'In Progress';
    try {
      final inTime = DateTime.parse(clockIn.toString());
      final outTime = DateTime.parse(clockOut.toString());
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
      if (dateKey.isNotEmpty) {
        grouped.putIfAbsent(dateKey, () => []).add(row);
      }
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

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.teal.shade700,
        foregroundColor: Colors.white,
        title: const Text('My Attendance', style: TextStyle(fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadAttendance,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _rows.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.schedule_rounded, size: 80, color: Colors.grey.shade400),
                      const SizedBox(height: 16),
                      Text(
                        'No Attendance Records',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: Colors.grey.shade700),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Your attendance logs will appear here',
                        style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                      ),
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
                            child: Text(
                              dateKey,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade800,
                              ),
                            ),
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
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: isActive
                                    ? Border.all(color: Colors.green.shade300, width: 2)
                                    : null,
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color.fromRGBO(0, 0, 0, 0.05),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
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
                                                decoration: BoxDecoration(
                                                  color: Colors.green.shade50,
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: Icon(Icons.login_rounded, size: 20, color: Colors.green.shade700),
                                              ),
                                              const SizedBox(width: 12),
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    'Clock In',
                                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                                  ),
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    _formatTime(inTs),
                                                    style: TextStyle(
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.bold,
                                                      color: Colors.grey.shade800,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        Container(
                                          width: 1,
                                          height: 40,
                                          color: Colors.grey.shade300,
                                        ),
                                        Expanded(
                                          child: Row(
                                            children: [
                                              const SizedBox(width: 12),
                                              Container(
                                                padding: const EdgeInsets.all(8),
                                                decoration: BoxDecoration(
                                                  color: isActive ? Colors.orange.shade50 : Colors.red.shade50,
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: Icon(
                                                  Icons.logout_rounded,
                                                  size: 20,
                                                  color: isActive ? Colors.orange.shade700 : Colors.red.shade700,
                                                ),
                                              ),
                                              const SizedBox(width: 12),
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    'Clock Out',
                                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                                  ),
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    _formatTime(outTs),
                                                    style: TextStyle(
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.bold,
                                                      color: isActive ? Colors.orange.shade700 : Colors.grey.shade800,
                                                    ),
                                                  ),
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
                                      decoration: BoxDecoration(
                                        color: isActive ? Colors.green.shade50 : Colors.blue.shade50,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            isActive ? Icons.access_time_rounded : Icons.timer_rounded,
                                            size: 16,
                                            color: isActive ? Colors.green.shade700 : Colors.blue.shade700,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            duration,
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w600,
                                              color: isActive ? Colors.green.shade700 : Colors.blue.shade700,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (note.isNotEmpty) ...[
                                      const SizedBox(height: 12),
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: Colors.grey.shade50,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Row(
                                          children: [
                                            Icon(Icons.notes_rounded, size: 16, color: Colors.grey.shade600),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(
                                                note,
                                                style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                                              ),
                                            ),
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
    );
  }
}