import React, { useEffect, useState } from "react";
import { User, Shield, Users, BarChart3, Settings, FileText, Activity, Clock, Calendar, Mail, CheckCircle, XCircle, TrendingUp, TrendingDown } from "lucide-react";

interface UserProfile {
  id?: number;
  email: string;
  username?: string;
  displayName?: string;
  phoneNumber?: string;
  locale?: string;
  roles: string[];
  isActive?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  mfaEnabled?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
  loginCount?: number;
}

interface AuditStats {
  totalLogs: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueUsers: number;
  recentActivities: Array<{
    user: string;
    action: string;
    time: string;
    success: boolean;
  }>;
}

// Get JWT from URL or cookies
const getJWT = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get("jwt");
  if (urlToken) return urlToken;

  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "jwt_token") return decodeURIComponent(value);
  }
  return null;
};

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    const token = getJWT();

    if (!token) {
      setError("No JWT token found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      // Fetch user profile
      const userResponse = await fetch("http://localhost:8081/api/v1/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!userResponse.ok) throw new Error(`Failed to fetch user: ${userResponse.status}`);
      const userData = await userResponse.json();
      setUser(userData);

      // Fetch audit logs for statistics
      try {
        const auditResponse = await fetch("http://localhost:8081/api/v1/admin/audit-log", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (auditResponse.ok) {
          const auditData = await auditResponse.json();
          
          // Process audit data for statistics
          const stats: AuditStats = {
            totalLogs: auditData.length,
            successfulLogins: auditData.filter((log: any) => log.success && log.eventType === "LOGIN").length,
            failedLogins: auditData.filter((log: any) => !log.success && log.eventType === "LOGIN").length,
            uniqueUsers: new Set(auditData.map((log: any) => log.email)).size,
            recentActivities: auditData.slice(0, 5).map((log: any) => ({
              user: log.email || "Unknown",
              action: log.eventType || "UNKNOWN",
              time: formatTimeAgo(log.createdAt),
              success: log.success ?? true
            }))
          };
          
          setAuditStats(stats);
        }
      } catch (auditError) {
        console.log("Audit logs not accessible (may require admin role)");
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "Unknown time";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } catch {
      return dateString;
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
      USER: "bg-blue-100 text-blue-700 border-blue-200",
      MODERATOR: "bg-green-100 text-green-700 border-green-200",
      MANAGER: "bg-orange-100 text-orange-700 border-orange-200",
    };
    return colors[role.toUpperCase()] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getEventIcon = (action: string) => {
    const icons: { [key: string]: any } = {
      LOGIN: User,
      LOGOUT: User,
      UPDATE: Settings,
      CREATE: FileText,
      DELETE: XCircle,
    };
    return icons[action.toUpperCase()] || Activity;
  };

  const quickActions = [
    {
      icon: Users,
      title: "Manage Users",
      description: "View and manage all users",
      color: "from-blue-500 to-blue-600",
      link: "/admin/users"
    },
    {
      icon: FileText,
      title: "Audit Logs",
      description: "Review system audit logs",
      color: "from-purple-500 to-purple-600",
      link: "/admin/audit-log"
    },
    {
      icon: Settings,
      title: "My Profile",
      description: "Update your profile settings",
      color: "from-indigo-500 to-indigo-600",
      link: "/profile"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border-l-4 border-red-500">
          <div className="flex items-start gap-4">
            <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user.displayName || user.username || user.email.split('@')[0]}!
          </h1>
          <p className="text-gray-600">Here's your dashboard overview</p>
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Display Name</p>
                <p className="text-sm font-semibold text-gray-900">{user.displayName || "Not set"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm font-semibold text-gray-900 break-words">{user.email}</p>
              </div>
              {user.phoneNumber && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="text-sm font-semibold text-gray-900">{user.phoneNumber}</p>
                </div>
              )}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs">
                  {user.emailVerified ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Email Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="w-3 h-3" />
                      Email Not Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Roles Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Roles & Permissions</h3>
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            {user.roles && user.roles.length > 0 ? (
              <div className="space-y-2">
                {user.roles.map((role) => (
                  <div
                    key={role}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border ${getRoleBadgeColor(role)}`}
                  >
                    {role}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No roles assigned</p>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Account Status</span>
                {user.isActive ? (
                  <span className="text-green-600 font-medium">Active</span>
                ) : (
                  <span className="text-red-600 font-medium">Inactive</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">MFA</span>
                {user.mfaEnabled ? (
                  <span className="text-green-600 font-medium">Enabled</span>
                ) : (
                  <span className="text-gray-500 font-medium">Disabled</span>
                )}
              </div>
            </div>
          </div>

          {/* Activity Summary Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Activity Summary</h3>
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">Last Login</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(user.lastLoginAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-xs text-gray-600">Member Since</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(user.createdAt)}</p>
                </div>
              </div>
              {user.loginCount !== undefined && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Total Logins</p>
                    <p className="text-sm font-semibold text-gray-900">{user.loginCount}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Cards (if admin) */}
        {auditStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Total Audit Logs</p>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{auditStats.totalLogs}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Successful Logins</p>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{auditStats.successfulLogins}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Failed Logins</p>
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{auditStats.failedLogins}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Unique Users</p>
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{auditStats.uniqueUsers}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => window.location.href = action.link}
                  className="group bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:scale-105 text-left"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">{action.title}</h4>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity (if admin) */}
        {auditStats && auditStats.recentActivities.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {auditStats.recentActivities.map((activity, index) => {
                const Icon = getEventIcon(activity.action);
                return (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`w-10 h-10 bg-gradient-to-br ${activity.success ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="font-semibold">{activity.user}</span> - {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                    {activity.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;