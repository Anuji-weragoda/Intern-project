import React, { useEffect, useState } from "react";
import { Users, Shield, Briefcase, User, Search, Filter, X, Check, AlertCircle } from "lucide-react";

interface AdminUser {
  id: number;
  email: string;
  username?: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

interface SpringPageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  number: number;
  size: number;
  empty: boolean;
}

const AVAILABLE_ROLES = [
  { value: "ADMIN", label: "Admin", icon: Shield, color: "blue" },
  { value: "HR", label: "HR", icon: Briefcase, color: "purple" },
  { value: "USER", label: "User", icon: User, color: "gray" }
];

// In-memory token storage
let cachedToken: string | null = null;

const getJWT = (): string | null => {
  console.log('🔍 Looking for JWT token...');
  
  // Return cached token if available
  if (cachedToken && cachedToken.length > 20) {
    console.log('✅ Using cached token');
    return cachedToken;
  }
  
  // 1. Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('jwt') || urlParams.get('token');
  if (urlToken && urlToken.length > 20) {
    cachedToken = urlToken;
    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname);
    console.log('✅ Token from URL saved to memory!');
    return urlToken;
  }

  // 2. Check localStorage (all possible keys)
  const storageKeys = ['jwt_token', 'id_token', 'access_token', 'token'];
  for (const key of storageKeys) {
    try {
      const token = localStorage.getItem(key);
      if (token && token.length > 20) {
        cachedToken = token;
        console.log(`✅ Token from localStorage (${key})!`);
        return token;
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  }

  // 3. Check sessionStorage
  for (const key of storageKeys) {
    try {
      const token = sessionStorage.getItem(key);
      if (token && token.length > 20) {
        cachedToken = token;
        console.log(`✅ Token from sessionStorage (${key})!`);
        return token;
      }
    } catch (e) {
      console.warn('sessionStorage not available:', e);
    }
  }

  // 4. Check cookies
  const cookies = document.cookie.split(';');
  console.log('🍪 Checking cookies:', document.cookie);
  
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (storageKeys.includes(name) && value && value.length > 20) {
      const token = decodeURIComponent(value);
      cachedToken = token;
      console.log(`✅ Token from cookie (${name}) saved!`);
      return token;
    }
  }

  console.error('❌ NO TOKEN FOUND!');
  console.error('Available cookies:', document.cookie);
  try {
    console.error('Available localStorage:', Object.keys(localStorage));
  } catch (e) {
    console.error('Cannot access localStorage');
  }
  return null;
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setDebugInfo("🔍 Getting JWT token...");

    const token = getJWT();

    if (!token) {
      setError("No authentication token found. Please log in via Cognito.");
      setDebugInfo("❌ No token found in URL, localStorage, sessionStorage, or cookies");
      setLoading(false);
      return;
    }

    setDebugInfo(`✅ Token found! Making API call...`);

    try {
      const response = await fetch(
        "http://localhost:8081/api/v1/admin/users?page=0&size=20",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          credentials: "include",
        }
      );

      setDebugInfo(`📡 Response: ${response.status} ${response.statusText}`);

      // Handle 401 - Token expired
      if (response.status === 401) {
        console.error('❌ Token expired or invalid - clearing storage');
        cachedToken = null;
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          console.warn('Cannot clear storage');
        }
        setError("Your session has expired. Please log in again.");
        setDebugInfo("❌ 401 Unauthorized - Session expired");
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        setLoading(false);
        return;
      }

      // Handle 403 - No permission
      if (response.status === 403) {
        setError("Access denied. Your account doesn't have ADMIN privileges in Cognito.");
        setDebugInfo("❌ 403 Forbidden - No admin access");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text}`);
      }

      const data: SpringPageResponse<AdminUser> = await response.json();

      if (Array.isArray(data.content)) {
        setUsers(data.content);
        setDebugInfo(`✅ SUCCESS! Loaded ${data.content.length} users from ${data.totalElements} total`);
      } else {
        throw new Error("Invalid data structure from server");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("❌ Error fetching users:", err);
      setError(msg);
      setDebugInfo(`❌ Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const openRoleModal = (user: AdminUser) => {
    setSelectedUser(user);
    setSelectedRoles([...user.roles]);
    setShowRoleModal(true);
  };

  const openUserDetailsModal = (user: AdminUser) => {
    setSelectedUser(user);
    setShowUserDetailsModal(true);
  };

  const openRoleModalFromDetails = () => {
    setShowUserDetailsModal(false);
    setShowRoleModal(true);
    setSelectedRoles(selectedUser ? [...selectedUser.roles] : []);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleUpdateRoles = async () => {
    if (!selectedUser) return;

    const token = getJWT();
    if (!token) {
      alert("❌ No authentication token! Please log in again.");
      window.location.href = '/';
      return;
    }

    setIsUpdating(true);

    try {
      // Send only the roleNames array as per the backend API
      const response = await fetch(
        `http://localhost:8081/api/v1/admin/users/${selectedUser.id}/roles`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            roleNames: selectedRoles,
            // addRoles and removeRoles are handled server-side by comparing current roles with requested roles
            addRoles: [],
            removeRoles: [],
            assignedBy: null // this will be set from JWT on server
          }),
        }
      );

      if (response.status === 401) {
        cachedToken = null;
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          console.warn('Cannot clear storage');
        }
        alert("❌ Session expired. Please log in again.");
        window.location.href = '/';
        return;
      }

      if (response.status === 403) {
        alert("❌ Access denied. You don't have permission to modify roles.");
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed (${response.status}): ${text}`);
      }

      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, roles: selectedRoles } : u
      ));
      setShowRoleModal(false);
      setSelectedUser(null);
      alert("✅ Roles updated successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("❌ Error updating roles:", err);
      alert("❌ Failed to update roles: " + msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleColor = (role: string) => {
    const roleConfig = AVAILABLE_ROLES.find(r => r.value === role);
    return roleConfig?.color || "gray";
  };

  const getRoleIcon = (role: string) => {
    const roleConfig = AVAILABLE_ROLES.find(r => r.value === role);
    return roleConfig?.icon || User;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.username?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesRole = !roleFilter || user.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.roles.includes("ADMIN")).length,
    hr: users.filter(u => u.roles.includes("HR")).length,
    users: users.filter(u => u.roles.includes("USER")).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">User Management</h1>
              <p className="text-slate-600 mt-1">Manage user roles and permissions across your organization</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {!loading && !error && users.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500 ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Users</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <Users className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Admins</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{stats.admins}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">HR Staff</p>
                  <p className="text-3xl font-bold text-purple-700 mt-1">{stats.hr}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Regular Users</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.users}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg">
                  <User className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
            <p className="text-slate-600 text-lg font-medium">Loading users...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-1">Authentication Error</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-sm text-red-900 mb-2">Troubleshooting Steps:</p>
                  <ol className="list-decimal ml-5 space-y-1 text-sm text-red-800">
                    <li>Ensure you're logged in via Cognito OAuth2</li>
                    <li>Your user must be in the ADMIN group in Cognito</li>
                    <li>Token should be in URL (?jwt=...), localStorage, sessionStorage, or cookies</li>
                    <li>Check backend logs for authentication issues</li>
                    <li>Try logging out and logging back in</li>
                  </ol>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                  >
                    Retry Connection
                  </button>
                  <button
                    onClick={() => {
                      console.log('Current URL:', window.location.href);
                      console.log('Cookies:', document.cookie);
                      try {
                        console.log('LocalStorage:', JSON.stringify(localStorage));
                        console.log('SessionStorage:', JSON.stringify(sessionStorage));
                      } catch (e) {
                        console.log('Cannot access storage');
                      }
                      alert('Check browser console for debug info');
                    }}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm"
                  >
                    Show Debug Info
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && users.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <p className="text-yellow-700">⚠️ No users found in the system.</p>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        {!loading && !error && users.length > 0 && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Search Users
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by email or username..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Filter by Role
                  </label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="">All Roles</option>
                      {AVAILABLE_ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  Showing <span className="font-semibold text-slate-900">{filteredUsers.length}</span> of <span className="font-semibold">{users.length}</span> users
                </span>
                {(searchQuery || roleFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setRoleFilter("");
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Roles</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map(user => {
                      const IconComponent = getRoleIcon(user.roles[0] || "USER");
                      return (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => openUserDetailsModal(user)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-${getRoleColor(user.roles[0] || "USER")}-100`}>
                                <IconComponent className={`w-5 h-5 text-${getRoleColor(user.roles[0] || "USER")}-600`} />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{user.username || "N/A"}</p>
                                <p className="text-sm text-slate-500">ID: {user.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-900">{user.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {user.roles.length > 0 ? user.roles.map(role => {
                                const color = getRoleColor(role);
                                return (
                                  <span
                                    key={role}
                                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-${color}-100 text-${color}-700 border border-${color}-200`}
                                  >
                                    {role}
                                  </span>
                                );
                              }) : (
                                <span className="text-sm text-slate-400 italic">No roles assigned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              user.isActive 
                                ? "bg-green-100 text-green-700 border border-green-200" 
                                : "bg-red-100 text-red-700 border border-red-200"
                            }`}>
                              {user.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRoleModal(user);
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              <Shield className="w-4 h-4" />
                              Manage Roles
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* User Details Modal */}
        {showUserDetailsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 sticky top-0 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-${getRoleColor(selectedUser.roles[0] || "USER")}-100`}>
                      {(() => {
                        const Icon = getRoleIcon(selectedUser.roles[0] || "USER");
                        return <Icon className={`w-8 h-8 text-${getRoleColor(selectedUser.roles[0] || "USER")}-600`} />;
                      })()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{selectedUser.username || "N/A"}</h3>
                      <p className="text-sm text-slate-600">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUserDetailsModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm font-medium text-blue-600 mb-1">Account Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${selectedUser.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <p className="text-lg font-bold text-blue-900">{selectedUser.isActive ? "Active" : "Inactive"}</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <p className="text-sm font-medium text-purple-600 mb-1">Assigned Roles</p>
                    <p className="text-lg font-bold text-purple-900">{selectedUser.roles.length} Role{selectedUser.roles.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* User Information */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-slate-600" />
                    User Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">User ID</p>
                      <p className="text-sm font-mono text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200">{selectedUser.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Username</p>
                      <p className="text-sm text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200">{selectedUser.username || "Not set"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email Address</p>
                      <p className="text-sm text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200 break-all">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>

                {/* Activity Information */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-slate-600" />
                    Activity Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Account Created</p>
                      <p className="text-sm text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200">
                        {new Date(selectedUser.createdAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Login</p>
                      <p className="text-sm text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200">
                        {selectedUser.lastLoginAt 
                          ? new Date(selectedUser.lastLoginAt).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : "Never logged in"
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Roles */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-slate-600" />
                      Current Roles & Permissions
                    </h4>
                    <button
                      onClick={openRoleModalFromDetails}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Shield className="w-4 h-4" />
                      Edit Roles
                    </button>
                  </div>
                  
                  {selectedUser.roles.length > 0 ? (
                    <div className="space-y-3">
                      {selectedUser.roles.map(role => {
                        const roleConfig = AVAILABLE_ROLES.find(r => r.value === role);
                        const Icon = roleConfig?.icon || User;
                        const color = roleConfig?.color || "gray";
                        
                        return (
                          <div key={role} className="bg-white rounded-lg p-4 border-2 border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-${color}-100`}>
                                <Icon className={`w-5 h-5 text-${color}-600`} />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900">{roleConfig?.label || role}</p>
                                <p className="text-xs text-slate-500">
                                  {role === "ADMIN" && "Full system access and user management"}
                                  {role === "HR" && "HR management and employee access"}
                                  {role === "USER" && "Basic user access and features"}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-700 border border-${color}-200`}>
                                {role}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                      <p className="text-sm text-yellow-800 font-medium">No roles assigned</p>
                      <p className="text-xs text-yellow-600 mt-1">Click "Edit Roles" to assign roles to this user</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 sticky bottom-0">
                <button
                  onClick={() => setShowUserDetailsModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={openRoleModalFromDetails}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Manage Roles
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role Management Modal */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Manage User Roles</h3>
                    <p className="text-sm text-slate-600 mt-1">{selectedUser.email}</p>
                  </div>
                  <button
                    onClick={() => setShowRoleModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-3">
                {AVAILABLE_ROLES.map(role => {
                  const Icon = role.icon;
                  const isSelected = selectedRoles.includes(role.value);
                  return (
                    <button
                      key={role.value}
                      onClick={() => toggleRole(role.value)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? `border-${role.color}-500 bg-${role.color}-50`
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected ? `bg-${role.color}-100` : "bg-slate-100"
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            isSelected ? `text-${role.color}-600` : "text-slate-500"
                          }`} />
                        </div>
                        <div className="text-left">
                          <p className={`font-semibold ${
                            isSelected ? `text-${role.color}-900` : "text-slate-900"
                          }`}>
                            {role.label}
                          </p>
                          <p className="text-xs text-slate-500">
                            {role.value === "ADMIN" && "Full system access"}
                            {role.value === "HR" && "HR management access"}
                            {role.value === "USER" && "Basic user access"}
                          </p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? `border-${role.color}-500 bg-${role.color}-500`
                          : "border-slate-300"
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setShowRoleModal(false)}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRoles}
                  disabled={isUpdating || selectedRoles.length === 0}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Update Roles
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;