import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import '../services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _loading = true;
  bool _signingOut = false;
  Map<String, dynamic>? _profileData;
  String? _error;
  String? _userEmail;
  String? _userId;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // Get user attributes from Cognito
      final attributes = await Amplify.Auth.fetchUserAttributes();
      final user = await Amplify.Auth.getCurrentUser();
      
      // Extract email from attributes
      for (var attribute in attributes) {
        if (attribute.userAttributeKey == CognitoUserAttributeKey.email) {
          _userEmail = attribute.value;
        }
      }
      
      _userId = user.userId;
      
      // Try to fetch profile from backend
      try {
        final profile = await ApiService.getUserProfile();
        
        if (mounted) {
          setState(() {
            _profileData = profile;
            _loading = false;
          });
        }
      } catch (apiError) {
        // If API fails, use Cognito data
        safePrint('API Error: $apiError');
        if (mounted) {
          setState(() {
            _error = 'Using local profile data';
            _profileData = {
              'email': _userEmail ?? user.username,
              'userId': _userId,
              'username': user.username,
            };
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

  Future<void> _signOut() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _signingOut = true);

    try {
      await Amplify.Auth.signOut();
      
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Successfully signed out'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _signingOut = false);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error signing out: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.blue.shade900,
              Colors.blue.shade600,
              Colors.purple.shade400,
            ],
          ),
        ),
        child: SafeArea(
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                )
              : RefreshIndicator(
                  onRefresh: _loadProfile,
                  color: Colors.blue.shade700,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        children: [
                          const SizedBox(height: 20),
                          
                          // Profile Avatar
                          Container(
                            width: 120,
                            height: 120,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.2),
                                  blurRadius: 20,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            child: Icon(
                              Icons.person,
                              size: 60,
                              color: Colors.blue.shade700,
                            ),
                          ),
                          const SizedBox(height: 24),

                          // User Name/Email
                          Text(
                            _profileData?['name'] ?? 
                            _profileData?['fullName'] ?? 
                            _userEmail?.split('@')[0] ?? 
                            'User',
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 8),
                          
                          Text(
                            _userEmail ?? _profileData?['email'] ?? 'No email',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.white.withOpacity(0.8),
                            ),
                          ),
                          const SizedBox(height: 40),

                          // Profile Information Card
                          Container(
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  blurRadius: 20,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(24.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Profile Information',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  const SizedBox(height: 20),

                                  if (_error != null) ...[
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.blue.shade50,
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: Colors.blue.shade200,
                                        ),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(
                                            Icons.info_outline,
                                            color: Colors.blue.shade700,
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Text(
                                              'Showing Cognito profile data',
                                              style: TextStyle(
                                                color: Colors.blue.shade900,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 20),
                                  ],

                                  // Always show email
                                  _buildInfoTile(
                                    'Email',
                                    _userEmail ?? _profileData?['email'] ?? 'N/A',
                                    Icons.email_outlined,
                                  ),

                                  // Show User ID
                                  _buildInfoTile(
                                    'User ID',
                                    _userId ?? 'N/A',
                                    Icons.fingerprint,
                                  ),

                                  // Display other profile fields
                                  if (_profileData != null)
                                    ..._profileData!.entries.where((entry) => 
                                      entry.key != 'email' && 
                                      entry.key != 'userId' &&
                                      entry.key != 'username'
                                    ).map((entry) {
                                      if (entry.key == 'roles' && entry.value is List) {
                                        final roles = (entry.value as List);
                                        if (roles.isNotEmpty) {
                                          return _buildInfoTile(
                                            'Roles',
                                            roles.join(', '),
                                            Icons.shield_outlined,
                                          );
                                        }
                                        return const SizedBox.shrink();
                                      }
                                      if (entry.value != null && entry.value.toString().isNotEmpty) {
                                        return _buildInfoTile(
                                          _formatFieldName(entry.key),
                                          entry.value.toString(),
                                          _getIconForField(entry.key),
                                        );
                                      }
                                      return const SizedBox.shrink();
                                    }).toList(),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 30),

                          // Sign Out Button
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
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.red.shade600,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                elevation: 5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildInfoTile(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              color: Colors.blue.shade700,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Colors.black87,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatFieldName(String key) {
    return key
        .replaceAllMapped(
          RegExp(r'([A-Z])'),
          (match) => ' ${match.group(1)}',
        )
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isEmpty
            ? ''
            : word[0].toUpperCase() + word.substring(1).toLowerCase())
        .join(' ')
        .trim();
  }

  IconData _getIconForField(String key) {
    switch (key.toLowerCase()) {
      case 'email':
        return Icons.email_outlined;
      case 'name':
      case 'username':
      case 'fullname':
        return Icons.person_outline;
      case 'phone':
      case 'phonenumber':
        return Icons.phone_outlined;
      case 'roles':
      case 'role':
        return Icons.shield_outlined;
      case 'userid':
      case 'id':
        return Icons.fingerprint;
      case 'createdat':
      case 'updatedat':
        return Icons.calendar_today_outlined;
      case 'department':
        return Icons.business_outlined;
      case 'position':
      case 'title':
        return Icons.work_outline;
      default:
        return Icons.info_outline;
    }
  }
}