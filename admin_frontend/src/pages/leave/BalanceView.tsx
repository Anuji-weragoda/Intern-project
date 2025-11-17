import React from 'react';
import { Calendar, TrendingUp, TrendingDown, Users, AlertCircle, Download, Search, Filter } from 'lucide-react';

interface LeaveBalance {
  id: number;
  user_id: string;
  policy_id: number;
  total_allocated: number;
  total_used: number;
  balance_days: number;
  year: number;
  created_at: string;
  policy_name?: string;
  leave_type?: string;
  userName?: string;
  userEmail?: string;
}

interface BalancesViewProps {
  rawBalances: LeaveBalance[];
  loadingUsersBalances: boolean;
}

interface GroupedBalance {
  user_id: string;
  userName?: string;
  userEmail?: string;
  year: number;
  policies: LeaveBalance[];
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
}

const BalanceView: React.FC<BalancesViewProps> = ({
  rawBalances,
  loadingUsersBalances,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterYear, setFilterYear] = React.useState<string>('all');

  // Get unique years from balances
  const availableYears = React.useMemo(() => {
    const years = new Set(rawBalances.map(b => b.year).filter(Boolean));
    return Array.from(years).sort((a, b) => b - a);
  }, [rawBalances]);

  // Group balances by user
  const groupedBalances = React.useMemo(() => {
    const groups = new Map<string, GroupedBalance>();

    rawBalances.forEach(balance => {
      const key = `${balance.user_id}-${balance.year}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          user_id: balance.user_id,
          userName: balance.userName,
          userEmail: balance.userEmail,
          year: balance.year,
          policies: [],
          totalAllocated: 0,
          totalUsed: 0,
          totalRemaining: 0
        });
      }

      const group = groups.get(key)!;
      group.policies.push(balance);
      group.totalAllocated += balance.total_allocated || 0;
      group.totalUsed += balance.total_used || 0;
      group.totalRemaining += balance.balance_days || 0;
    });

    return Array.from(groups.values());
  }, [rawBalances]);

  // Filter grouped balances
  const filteredBalances = React.useMemo(() => {
    let filtered = groupedBalances;

    if (filterYear !== 'all') {
      filtered = filtered.filter(g => g.year === parseInt(filterYear));
    }

    if (searchTerm) {
      filtered = filtered.filter(g =>
        g.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [groupedBalances, filterYear, searchTerm]);

  // Calculate overall stats
  const stats = React.useMemo(() => {
    const totalUsers = groupedBalances.length;
    const totalAllocated = groupedBalances.reduce((sum, g) => sum + g.totalAllocated, 0);
    const totalUsed = groupedBalances.reduce((sum, g) => sum + g.totalUsed, 0);
    const totalRemaining = groupedBalances.reduce((sum, g) => sum + g.totalRemaining, 0);
    const utilizationRate = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

    return { totalUsers, totalAllocated, totalUsed, totalRemaining, utilizationRate };
  }, [groupedBalances]);

  const getBalanceColor = (balance: number, allocated: number) => {
    if (allocated === 0) return 'text-slate-600 bg-slate-50 border-slate-200';
    const percentage = (balance / allocated) * 100;
    if (percentage >= 70) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 30) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getProgressColor = (used: number, allocated: number) => {
    if (allocated === 0) return 'bg-slate-400';
    const percentage = (used / allocated) * 100;
    if (percentage >= 70) return 'bg-red-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPolicyIcon = (policyName: string) => {
    const name = policyName?.toLowerCase() || '';
    if (name.includes('annual') || name.includes('vacation')) return '🏖️';
    if (name.includes('sick')) return '🏥';
    if (name.includes('personal')) return '👤';
    if (name.includes('maternity')) return '👶';
    if (name.includes('paternity')) return '👨‍👧';
    return '📋';
  };

  const handleExport = () => {
    const csv = [
      ['User ID', 'User Name', 'Email', 'Policy', 'Allocated', 'Used', 'Balance', 'Year'],
      ...filteredBalances.flatMap(group =>
        group.policies.map(policy => [
          group.user_id,
          group.userName || '',
          group.userEmail || '',
          policy.policy_name || `Policy ${policy.policy_id}`,
          policy.total_allocated || 0,
          policy.total_used || 0,
          policy.balance_days || 0,
          group.year || ''
        ])
      )
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-balances-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loadingUsersBalances) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading balances...</p>
        </div>
      </div>
    );
  }

  if (!rawBalances || rawBalances.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-300">
        <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No Leave Balances Available</h3>
        <p className="text-slate-600">
          Ensure the raw-leave-balances endpoint is deployed on the server.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Total Users</span>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalUsers}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Total Allocated</span>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalAllocated}</p>
          <p className="text-xs text-slate-500 mt-1">days</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Total Used</span>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalUsed}</p>
          <p className="text-xs text-slate-500 mt-1">days</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Remaining</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalRemaining}</p>
          <p className="text-xs text-slate-500 mt-1">days</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">Utilization</span>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.utilizationRate}%</p>
          <p className="text-xs text-indigo-200 mt-1">of total</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by user ID, name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Year Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none min-w-[150px]"
              >
                <option value="all">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Download className="w-5 h-6" />
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-slate-600">
        Showing <span className="font-semibold">{filteredBalances.length}</span> {filteredBalances.length === 1 ? 'user' : 'users'}
      </div>

      {/* User Cards with Grouped Policies */}
      <div className="space-y-6">
        {filteredBalances.map((group) => (
          <div
            key={`${group.user_id}-${group.year}`}
            className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
          >
            {/* User Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-indigo-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-2xl">
                      {group.userName?.charAt(0) || group.user_id.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {group.userName || `User ${group.user_id.substring(0, 8)}...`}
                    </h3>
                    <p className="text-slate-600">{group.userEmail || group.user_id}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Year: {group.year}
                    </p>
                  </div>
                </div>

                {/* Overall Summary */}
                <div className="text-right">
                  <p className="text-sm text-slate-600 mb-1">Total Balance</p>
                  <p className="text-3xl font-bold text-indigo-600">{group.totalRemaining}</p>
                  <p className="text-sm text-slate-500">of {group.totalAllocated} days</p>
                </div>
              </div>
            </div>

            {/* Policy Breakdown */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.policies.map((policy) => (
                  <div
                    key={policy.id}
                    className="bg-slate-50 rounded-lg border-2 border-slate-200 p-4 hover:shadow-md transition-all"
                  >
                    {/* Policy Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getPolicyIcon(policy.policy_name || '')}</span>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {policy.policy_name || `Policy ${policy.policy_id}`}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {policy.leave_type || `ID: ${policy.policy_id}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Allocated</span>
                        <span className="font-semibold text-slate-900">
                          {policy.total_allocated} days
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Used</span>
                        <span className="font-semibold text-red-600">
                          {policy.total_used} days
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-slate-300">
                        <span className="text-slate-900 font-medium">Remaining</span>
                        <span className={`font-bold px-2 py-1 rounded text-sm ${getBalanceColor(policy.balance_days, policy.total_allocated).split(' ').slice(0, 1).join(' ')}`}>
                          {policy.balance_days} days
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Utilization</span>
                        <span>
                          {policy.total_allocated > 0
                            ? Math.round((policy.total_used / policy.total_allocated) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${getProgressColor(policy.total_used, policy.total_allocated)}`}
                          style={{
                            width: `${policy.total_allocated > 0 ? Math.min((policy.total_used / policy.total_allocated) * 100, 100) : 0}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Progress */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">Overall Utilization</span>
                  <span className="text-sm font-bold text-slate-900">
                    {group.totalAllocated > 0
                      ? Math.round((group.totalUsed / group.totalAllocated) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all ${getProgressColor(group.totalUsed, group.totalAllocated)}`}
                    style={{
                      width: `${group.totalAllocated > 0 ? Math.min((group.totalUsed / group.totalAllocated) * 100, 100) : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BalanceView;
