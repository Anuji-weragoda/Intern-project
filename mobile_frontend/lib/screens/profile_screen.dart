import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import '../services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _loading = true;
  bool _signingOut = false;
  bool _isEditing = false;
  bool _isSaving = false;

  Map<String, dynamic>? _profileData;
  String? _error;
  String? _userEmail;
  String? _userId;
  String? _username;
  List<String>? _userRoles;

  final _displayNameController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final attributes = await Amplify.Auth.fetchUserAttributes();
      final user = await Amplify.Auth.getCurrentUser();

      for (var attribute in attributes) {
        if (attribute.userAttributeKey == CognitoUserAttributeKey.email) {
          _userEmail = attribute.value;
        }
      }

      _userId = user.userId;

      try {
        final profile = await ApiService.getUserProfile();
        if (mounted) {
          setState(() {
            _profileData = profile;
            _username = profile['username'] ?? user.username;
            _userRoles = profile['roles'] != null ? List<String>.from(profile['roles']) : [];
            _populateControllers();
            _loading = false;
          });
        }
      } catch (apiError) {
        safePrint('API Error: $apiError');
        if (mounted) {
          setState(() {
            _error = 'Using local profile data';
            _profileData = {
              'email': _userEmail ?? user.username,
              'userId': _userId,
              'username': user.username,
            };
            _username = user.username;
            _populateControllers();
            _loading = false;
          });
        }
      }
    } catch (e) {
      safePrint('Error loading profile: $e');
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  void _populateControllers() {
    _displayNameController.text = _profileData?['displayName'] ?? _username ?? '';
    _phoneController.text = _profileData?['phone'] ?? _profileData?['phoneNumber'] ?? '';
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);

    try {
      final updates = {
        'displayName': _displayNameController.text.trim(),
        'phoneNumber': _phoneController.text.trim(),
      };

      await ApiService.updateUserProfile(updates);

      if (mounted) {
        setState(() {
          _isEditing = false;
          _isSaving = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Text('Profile updated successfully'),
              ],
            ),
            backgroundColor: Colors.green.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            margin: const EdgeInsets.all(16),
          ),
        );

        await _loadProfile();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(child: Text('Failed to update: ${e.toString()}')),
              ],
            ),
            backgroundColor: Colors.red.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    }
  }

  void _cancelEdit() {
    setState(() {
      _isEditing = false;
      _populateControllers();
    });
  }

  Future<void> _signOut() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Row(
          children: [
            Icon(Icons.logout, color: Colors.red, size: 28),
            SizedBox(width: 12),
            Text('Sign Out'),
          ],
        ),
        content: const Text(
          'Are you sure you want to sign out?',
          style: TextStyle(fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade600,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _signingOut = true);

    try {
      try {
        await ApiService.logoutUser();
      } catch (_) {}

      await Amplify.Auth.signOut();

      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _signingOut = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error signing out: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0F172A), // slate-900
              Color(0xFF1E3A8A), // blue-900
              Color(0xFF0F172A), // slate-900
            ],
          ),
        ),
        child: SafeArea(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: Colors.white))
              : RefreshIndicator(
                  onRefresh: _loadProfile,
                  color: const Color(0xFF3B82F6), // blue-500
                  child: CustomScrollView(
                    slivers: [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Profile',
                                    style: TextStyle(
                                      fontSize: 32,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  if (!_isEditing)
                                    IconButton(
                                      onPressed: () {
                                        setState(() => _isEditing = true);
                                      },
                                      icon: Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withAlpha((0.2 * 255).round()),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Icon(Icons.edit, color: Colors.white, size: 20),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 40),
                              Container(
                                width: 130,
                                height: 130,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [
                                      Color(0xFF3B82F6), // blue-500
                                      Color(0xFF4F46E5), // indigo-600
                                    ],
                                  ),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 4),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF3B82F6).withAlpha((0.3 * 255).round()),
                                      blurRadius: 24,
                                      offset: const Offset(0, 12),
                                    ),
                                  ],
                                ),
                                child: const Icon(Icons.person, size: 70, color: Colors.white),
                              ),
                              const SizedBox(height: 20),
                              Text(
                                _username ?? 'User',
                                style: const TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 8),

                              if (_error != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8.0),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: Colors.red.withAlpha((0.9 * 255).round()),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.error_outline, color: Colors.white, size: 16),
                                        const SizedBox(width: 8),
                                        Flexible(
                                          child: Text(
                                            _error!,
                                            style: const TextStyle(color: Colors.white),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),

                              if (_userRoles != null && _userRoles!.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 10.0),
                                  child: Wrap(
                                    spacing: 8,
                                    runSpacing: 6,
                                    children: _userRoles!
                                        .map((r) => Chip(
                                              label: Text(r, style: const TextStyle(color: Colors.white)),
                                              backgroundColor: Colors.white.withAlpha((0.08 * 255).round()),
                                              visualDensity: VisualDensity.compact,
                                            ))
                                        .toList(),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),

                      // Content section
                      SliverToBoxAdapter(
                        child: Container(
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.only(
                              topLeft: Radius.circular(40),
                              topRight: Radius.circular(40),
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(28.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (_isEditing)
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          onPressed: _isSaving ? null : _cancelEdit,
                                          icon: const Icon(Icons.close),
                                          label: const Text('Cancel'),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: _isSaving ? null : _saveProfile,
                                          icon: _isSaving
                                              ? const SizedBox(
                                                  width: 16,
                                                  height: 16,
                                                  child: CircularProgressIndicator(
                                                    color: Colors.white,
                                                    strokeWidth: 2,
                                                  ),
                                                )
                                              : const Icon(Icons.check),
                                          label: Text(_isSaving ? 'Saving...' : 'Save'),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF3B82F6), // blue-500
                                            foregroundColor: Colors.white,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                if (_isEditing) const SizedBox(height: 24),

                                const Text(
                                  'Personal Information',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 24),

                                _buildInfoField(
                                  label: 'Email Address',
                                  value: _userEmail ?? 'N/A',
                                  icon: Icons.email_outlined,
                                  isEditable: false,
                                ),
                                const SizedBox(height: 20),

                                _buildInfoField(
                                  label: 'Display Name',
                                  controller: _displayNameController,
                                  icon: Icons.person_outline,
                                  isEditable: _isEditing,
                                ),
                                const SizedBox(height: 20),

                                _buildInfoField(
                                  label: 'Phone Number',
                                  controller: _phoneController,
                                  icon: Icons.phone_outlined,
                                  isEditable: _isEditing,
                                  keyboardType: TextInputType.phone,
                                ),
                                const SizedBox(height: 40),

                                SizedBox(
                                  width: double.infinity,
                                  height: 56,
                                  child: ElevatedButton.icon(
                                    onPressed: _signingOut ? null : _signOut,
                                    icon: _signingOut
                                        ? const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(
                                              color: Colors.white,
                                              strokeWidth: 2,
                                            ),
                                          )
                                        : const Icon(Icons.logout),
                                    label: Text(
                                      _signingOut ? 'Signing Out...' : 'Sign Out',
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.red.shade600,
                                      foregroundColor: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildInfoField({
    required String label,
    String? value,
    TextEditingController? controller,
    required IconData icon,
    required bool isEditable,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 18, color: const Color(0xFF3B82F6)), // blue-500
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: isEditable ? Colors.white : Colors.grey.shade50,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isEditable ? const Color(0xFF93C5FD) : Colors.grey.shade200, // blue-300
              width: isEditable ? 2 : 1,
            ),
          ),
          child: isEditable && controller != null
              ? TextField(
                  controller: controller,
                  keyboardType: keyboardType,
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                    hintText: 'Enter $label',
                  ),
                )
              : Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                  child: Text(
                    value ?? controller?.text ?? 'Not set',
                    style: TextStyle(
                      fontSize: 16,
                      color: (value ?? controller?.text ?? '').isEmpty ? Colors.grey.shade400 : Colors.black87,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
        ),
      ],
    );
  }
}
