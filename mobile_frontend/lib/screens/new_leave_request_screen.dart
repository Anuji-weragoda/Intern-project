import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'dart:convert';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class NewLeaveRequestScreen extends StatefulWidget {
  const NewLeaveRequestScreen({super.key});

  @override
  State<NewLeaveRequestScreen> createState() => _NewLeaveRequestScreenState();
}

class _NewLeaveRequestScreenState extends State<NewLeaveRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  DateTime? _startDate;
  DateTime? _endDate;
  String _reason = '';
  String _leaveType = 'annual';
  bool _submitting = false;

  final List<Map<String, dynamic>> _leaveTypes = [
    {'value': 'annual', 'label': 'Annual Leave', 'icon': Icons.beach_access_rounded, 'color': Colors.blue, 'policy_id': 1},
    {'value': 'sick', 'label': 'Sick Leave', 'icon': Icons.local_hospital_rounded, 'color': Colors.red, 'policy_id': 2},
    {'value': 'casual', 'label': 'Casual Leave', 'icon': Icons.event_rounded, 'color': Colors.orange, 'policy_id': 3},
    {'value': 'no_pay', 'label': 'No Pay Leave', 'icon': Icons.money_off_rounded, 'color': Colors.grey, 'policy_id': 4},
    {'value': 'maternity', 'label': 'Maternity Leave', 'icon': Icons.child_care_rounded, 'color': Colors.pink, 'policy_id': 5},
    {'value': 'paternity', 'label': 'Paternity Leave', 'icon': Icons.family_restroom_rounded, 'color': Colors.indigo, 'policy_id': 6},
  ];

  Future<void> _pickStart() async {
    final now = DateTime.now();
    final res = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: DateTime(now.year + 2),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );
    if (res != null) {
      setState(() {
        _startDate = res;
        // Reset end date if it's before start date
        if (_endDate != null && _endDate!.isBefore(res)) {
          _endDate = null;
        }
      });
    }
  }

  Future<void> _pickEnd() async {
    final now = DateTime.now();
    final init = _startDate ?? now;
    final res = await showDatePicker(
      context: context,
      initialDate: init,
      firstDate: init,
      lastDate: DateTime(now.year + 2),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );
    if (res != null) setState(() => _endDate = res);
  }

  String _formatDate(DateTime date) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return '${weekdays[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  int _calculateDays() {
    if (_startDate == null || _endDate == null) return 0;
    return _endDate!.difference(_startDate!).inDays + 1;
  }

  String _formatDateForApi(DateTime date) {
    // Send in multiple formats to ensure backend can parse
    // JavaScript Date constructor prefers ISO 8601 format
    // Format: YYYY-MM-DDT00:00:00.000Z
    final utcDate = DateTime.utc(date.year, date.month, date.day);
    return utcDate.toIso8601String(); // Returns: 2025-11-19T00:00:00.000Z
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please select start and end dates'),
          backgroundColor: AppColors.warning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    
    // Validate that end date is not before start date
    if (_endDate!.isBefore(_startDate!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('End date cannot be before start date'),
          backgroundColor: AppColors.danger,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    
    setState(() => _submitting = true);
    try {
      // Format dates as YYYY-MM-DD (ensure proper format)
      final startDateStr = _formatDateForApi(_startDate!);
      final endDateStr = _formatDateForApi(_endDate!);
      
      // Get policy_id from selected leave type
      final selectedLeaveType = _leaveTypes.firstWhere(
        (type) => type['value'] == _leaveType,
        orElse: () => _leaveTypes[0],
      );
      final policyId = selectedLeaveType['policy_id'] ?? 1;
      
      // Debug logging
      safePrint('=== Leave Request Debug ===');
      safePrint('Start Date Object: $_startDate');
      safePrint('Start Date Type: ${_startDate.runtimeType}');
      safePrint('End Date Object: $_endDate');
      safePrint('End Date Type: ${_endDate.runtimeType}');
      safePrint('Start Date Formatted: $startDateStr');
      safePrint('Start Date Formatted Type: ${startDateStr.runtimeType}');
      safePrint('End Date Formatted: $endDateStr');
      safePrint('End Date Formatted Type: ${endDateStr.runtimeType}');
      safePrint('Reason: "${_reason.trim()}"');
      safePrint('Reason length: ${_reason.trim().length}');
      safePrint('Leave Type: $_leaveType');
      safePrint('Policy ID: $policyId');
      safePrint('Policy ID Type: ${policyId.runtimeType}');
      
      final payload = {
        'start_date': startDateStr,
        'end_date': endDateStr,
        'reason': _reason.trim(),
        'policy_id': policyId,
      };
      
      safePrint('Full Payload: $payload');
      safePrint('Payload Type: ${payload.runtimeType}');
      safePrint('Payload Keys: ${payload.keys.toList()}');
      safePrint('Payload Values: ${payload.values.toList()}');
      safePrint('JSON Encoded Payload: ${json.encode(payload)}');
      safePrint('========================');
      
      final res = await ApiService.createLeaveRequest(payload);
      safePrint('Create leave response: $res');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Leave request submitted successfully'),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      safePrint('Error creating leave: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create leave: ${e.toString()}'),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final days = _calculateDays();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: const Color.fromARGB(255, 252, 252, 252),
        foregroundColor: const Color.fromARGB(255, 0, 0, 0),
        title: const Text('New Leave Request', style: TextStyle(fontWeight: FontWeight.w600)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Leave Type Section
                Text(
                  'Leave Type',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(13),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: _leaveTypes.map((type) {
                      final isSelected = _leaveType == type['value'];
                      return InkWell(
                        onTap: () => setState(() => _leaveType = type['value']),
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isSelected ? (type['color'] as Color).withAlpha((0.1 * 255).round()) : Colors.transparent,
                            borderRadius: BorderRadius.circular(16),
                            border: isSelected
                                ? Border.all(color: type['color'], width: 2)
                                : null,
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: (type['color'] as Color).withAlpha((0.15 * 255).round()),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(
                                  type['icon'],
                                  color: type['color'],
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Text(
                                  type['label'],
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                    color: isSelected ? type['color'] : AppColors.textSecondary,
                                  ),
                                ),
                              ),
                              if (isSelected)
                                Icon(Icons.check_circle_rounded, color: type['color'], size: 24)
                              else
                                Icon(Icons.circle_outlined, color: Colors.grey.shade400, size: 24),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 24),

                // Date Selection Section
                Text(
                  'Duration',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade800,
                  ),
                ),
                const SizedBox(height: 12),

                // Start Date
                InkWell(
                  onTap: _pickStart,
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
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
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(Icons.event_rounded, color: Colors.green.shade700, size: 24),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Start Date',
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _startDate == null ? 'Select start date' : _formatDate(_startDate!),
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: _startDate == null ? Colors.grey.shade400 : Colors.grey.shade800,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // End Date
                InkWell(
                  onTap: _pickEnd,
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
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
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(Icons.event_available_rounded, color: Colors.red.shade700, size: 24),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'End Date',
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _endDate == null ? 'Select end date' : _formatDate(_endDate!),
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: _endDate == null ? Colors.grey.shade400 : Colors.grey.shade800,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
                      ],
                    ),
                  ),
                ),

                // Duration Display
                if (days > 0) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                        color: AppColors.primary.withAlpha((0.06 * 255).round()),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.primary.withAlpha((0.18 * 255).round())),
                      ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                          Icon(Icons.calendar_month_rounded, color: AppColors.primary, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Total: $days ${days == 1 ? 'day' : 'days'}',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 24),

                // Reason Section
                Text(
                  'Reason',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
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
                  child: TextFormField(
                    decoration: InputDecoration(
                      hintText: 'Briefly explain your reason for leave...',
                      hintStyle: TextStyle(color: AppColors.textSecondary),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.all(16),
                      prefixIcon: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Icon(Icons.notes_rounded, color: AppColors.textSecondary),
                      ),
                    ),
                    maxLines: 4,
                    onChanged: (v) => _reason = v,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Please provide a reason' : null,
                  ),
                ),
                const SizedBox(height: 32),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                      disabledBackgroundColor: Colors.grey.shade300,
                    ),
                    child: _submitting
                        ? const SizedBox(
                            height: 24,
                            width: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.send_rounded, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Submit Request',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}