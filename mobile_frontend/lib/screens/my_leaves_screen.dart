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
  String _selectedFilter = 'all'; // all, pending, approved, rejected

  @override
  void initState() {
    super.initState();
    _loadLeaves();
  }

  Future<void> _loadLeaves() async {
    setState(() => _loading = true);
    try {
      final list = await ApiService.getMyLeaves();
      if (mounted) {
        // Sort by most recently created first (by created_at/createdAt)
        list.sort((a, b) {
          try {
            // Try different field names for created date
            final createdA = a['created_at'] ?? a['createdAt'] ?? a['created'] ?? a['start_date'] ?? a['startDate'] ?? '1900-01-01';
            final createdB = b['created_at'] ?? b['createdAt'] ?? b['created'] ?? b['start_date'] ?? b['startDate'] ?? '1900-01-01';
            final dateA = DateTime.parse(createdA.toString());
            final dateB = DateTime.parse(createdB.toString());
            return dateB.compareTo(dateA); // Descending order (most recent first)
          } catch (e) {
            return 0;
          }
        });
        setState(() => _leaves = list);
      }
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

  List<dynamic> get _filteredLeaves {
    if (_selectedFilter == 'all') return _leaves;
    return _leaves.where((leave) {
      final status = (leave['status'] ?? '').toString().toLowerCase();
      return status == _selectedFilter;
    }).toList();
  }

  int _getStatusCount(String status) {
    if (status == 'all') return _leaves.length;
    return _leaves.where((leave) {
      final leaveStatus = (leave['status'] ?? '').toString().toLowerCase();
      return leaveStatus == status;
    }).length;
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

  Widget _buildFilterChip(String label, String value, IconData icon) {
    final isSelected = _selectedFilter == value;
    final count = _getStatusCount(value);
    final color = value == 'all' 
        ? Colors.blue 
        : _getStatusColor(value);

    return FilterChip(
      selected: isSelected,
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: isSelected ? Colors.white : color),
          const SizedBox(width: 6),
          Text(label),
          if (count > 0) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white.withAlpha(77) : color.withAlpha(51),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : color,
                ),
              ),
            ),
          ],
        ],
      ),
      onSelected: (selected) {
        setState(() => _selectedFilter = value);
      },
      backgroundColor: Colors.white,
      selectedColor: color,
      checkmarkColor: Colors.white,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : color,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
      ),
      elevation: isSelected ? 2 : 0,
      pressElevation: 4,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredLeaves = _filteredLeaves;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: const Color.fromARGB(255, 250, 250, 250),
        foregroundColor: const Color.fromARGB(255, 5, 0, 0),
        title: const Text('My Leave Requests', style: TextStyle(fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadLeaves,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips Section
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
                boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(13),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('All', 'all', Icons.list_rounded),
                  const SizedBox(width: 8),
                  _buildFilterChip('Pending', 'pending', Icons.access_time),
                  const SizedBox(width: 8),
                  _buildFilterChip('Approved', 'approved', Icons.check_circle),
                  const SizedBox(width: 8),
                  _buildFilterChip('Rejected', 'rejected', Icons.cancel),
                ],
              ),
            ),
          ),
          
          // Leaves List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : filteredLeaves.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _selectedFilter == 'all' 
                                  ? Icons.event_busy_rounded 
                                  : Icons.filter_list_off_rounded,
                              size: 80,
                              color: Colors.grey.shade400,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _selectedFilter == 'all'
                                  ? 'No Leave Requests'
                                  : 'No ${_selectedFilter.toUpperCase()} Requests',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey.shade700,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _selectedFilter == 'all'
                                  ? 'Tap the button below to create one'
                                  : 'Try selecting a different filter',
                              style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadLeaves,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredLeaves.length,
                          itemBuilder: (context, i) {
                            final r = filteredLeaves[i];
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
                                    color: Colors.black.withAlpha(13),
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
                                                color: statusColor.withAlpha(26),
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
          ),
        ],
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
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('New Request', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
      ),
    );
  }
}