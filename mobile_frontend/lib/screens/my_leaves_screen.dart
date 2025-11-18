import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import '../services/api_service.dart';
import 'new_leave_request_screen.dart';

class MyLeavesScreen extends StatefulWidget {
  const MyLeavesScreen({super.key});

  @override
  State<MyLeavesScreen> createState() => _MyLeavesScreenState();
}

class _MyLeavesScreenState extends State<MyLeavesScreen> {
  bool _loading = true;
  List<dynamic> _leaves = [];

  @override
  void initState() {
    super.initState();
    _loadLeaves();
  }

  Future<void> _loadLeaves() async {
    setState(() => _loading = true);
    try {
      final list = await ApiService.getMyLeaves();
      if (mounted) setState(() => _leaves = list);
    } catch (e) {
      safePrint('Error loading leaves: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load leaves: ${e.toString()}'),
            backgroundColor: Colors.red.shade400,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return Icons.check_circle;
      case 'pending':
        return Icons.access_time;
      case 'rejected':
        return Icons.cancel;
      default:
        return Icons.help_outline;
    }
  }

  int _calculateDays(String start, String end) {
    try {
      final startDate = DateTime.parse(start);
      final endDate = DateTime.parse(end);
      return endDate.difference(startDate).inDays + 1;
    } catch (e) {
      return 0;
    }
  }

  String _formatDate(String date) {
    try {
      final dt = DateTime.parse(date);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (e) {
      return date;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        title: const Text('My Leave Requests', style: TextStyle(fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadLeaves,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _leaves.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.event_busy_rounded, size: 80, color: Colors.grey.shade400),
                      const SizedBox(height: 16),
                      Text(
                        'No Leave Requests',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: Colors.grey.shade700),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Tap the button below to create one',
                        style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadLeaves,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _leaves.length,
                    itemBuilder: (context, i) {
                      final r = _leaves[i];
                      final start = r['start_date'] ?? r['startDate'] ?? '';
                      final end = r['end_date'] ?? r['endDate'] ?? '';
                      final status = r['status'] ?? 'unknown';
                      final reason = r['reason'] ?? 'No reason provided';
                      final days = _calculateDays(start, end);
                      final statusColor = _getStatusColor(status);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            decoration: BoxDecoration(
                              border: Border(
                                left: BorderSide(color: statusColor, width: 4),
                              ),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Icon(Icons.calendar_today_rounded, size: 16, color: Colors.grey.shade600),
                                                const SizedBox(width: 6),
                                                Text(
                                                  _formatDate(start),
                                                  style: TextStyle(
                                                    fontSize: 15,
                                                    fontWeight: FontWeight.w600,
                                                    color: Colors.grey.shade800,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Row(
                                              children: [
                                                const SizedBox(width: 22),
                                                Icon(Icons.arrow_downward_rounded, size: 14, color: Colors.grey.shade400),
                                                const SizedBox(width: 6),
                                                Text(
                                                  _formatDate(end),
                                                  style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                        decoration: BoxDecoration(
                                          color: statusColor.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(_getStatusIcon(status), size: 16, color: statusColor),
                                            const SizedBox(width: 6),
                                            Text(
                                              status.toUpperCase(),
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                                color: statusColor,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
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
                                            reason,
                                            style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (days > 0) ...[
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        Icon(Icons.event_available_rounded, size: 16, color: Colors.blue.shade600),
                                        const SizedBox(width: 6),
                                        Text(
                                          '$days ${days == 1 ? 'day' : 'days'}',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w500,
                                            color: Colors.blue.shade700,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final res = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const NewLeaveRequestScreen()),
          );
          if (res == true) _loadLeaves();
        },
        backgroundColor: Colors.blue.shade700,
        icon: const Icon(Icons.add_rounded),
        label: const Text('New Request', style: TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }
}