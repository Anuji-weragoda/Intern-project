import { useEffect, useState } from "react";
import Card from "../components/Card";
import { User, Shield, Clock, Users, Activity, Bell } from "lucide-react";
import useAuth from "../hooks/useAuth";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  recentLogins: number;
  pendingTasks: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    recentLogins: 0,
    pendingTasks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated API call for dashboard stats
    const fetchStats = async () => {
      try {
        // Replace with actual API call
        setStats({
          totalUsers: 150,
          activeUsers: 42,
          recentLogins: 28,
          pendingTasks: 5
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.displayName || "Admin"}</h1>
        <p className="text-gray-600">Here's what's happening in your staff management system.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="transform hover:scale-105 transition-transform">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 mb-1 text-sm">Total Users</p>
              <h3 className="text-2xl font-bold">{stats.totalUsers}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-green-600">
            <Activity className="w-4 h-4 mr-1" />
            <span>Active growth</span>
          </div>
        </Card>

        <Card className="transform hover:scale-105 transition-transform">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 mb-1 text-sm">Active Now</p>
              <h3 className="text-2xl font-bold">{stats.activeUsers}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <User className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-blue-600">
            <Clock className="w-4 h-4 mr-1" />
            <span>Updated just now</span>
          </div>
        </Card>

        <Card className="transform hover:scale-105 transition-transform">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 mb-1 text-sm">Recent Logins</p>
              <h3 className="text-2xl font-bold">{stats.recentLogins}</h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-purple-600">
            <Activity className="w-4 h-4 mr-1" />
            <span>Last 24 hours</span>
          </div>
        </Card>

        <Card className="transform hover:scale-105 transition-transform">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 mb-1 text-sm">Pending Tasks</p>
              <h3 className="text-2xl font-bold">{stats.pendingTasks}</h3>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Bell className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-orange-600">
            <Clock className="w-4 h-4 mr-1" />
            <span>Requires attention</span>
          </div>
        </Card>
      </div>

      {/* User Info and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="User Information" className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{user?.displayName || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="font-medium">{user?.roles?.[0] || "No role assigned"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium">Active</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Recent Activity" className="lg:col-span-2">
          <div className="space-y-4">
            {/* Add your activity feed here */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">New user registered</p>
                <p className="text-sm text-gray-600">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="bg-green-100 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Role updated</p>
                <p className="text-sm text-gray-600">1 hour ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">System update completed</p>
                <p className="text-sm text-gray-600">3 hours ago</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
