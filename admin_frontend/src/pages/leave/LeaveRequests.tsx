import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Ban, Plus, X, AlertCircle, User, FileText } from 'lucide-react';
import {
  getLeaveRequests,
  getLeaveBalance,
  createLeaveRequest as leaveCreate,
  patchLeaveRequest as leavePatch,
} from '../../api/leaveApi';

const LeaveManagementSystem = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch requests
      const requestsRes = await getLeaveRequests();
      if (!requestsRes.ok) {
        const t = await requestsRes.text();
        throw new Error(`Failed to fetch leave requests: ${requestsRes.status} ${requestsRes.statusText}: ${t.slice(0,400)}`);
      }
      const requestsData = await requestsRes.json().catch(async () => {
        const t = await requestsRes.text();
        throw new Error(`Invalid JSON from leave requests: ${t.slice(0,400)}`);
      });
      const resolvedRequests = Array.isArray(requestsData)
        ? requestsData
        : (requestsData?.items || requestsData?.requests || requestsData?.data || []);
      setRequests(resolvedRequests || []);
      
      // Fetch balances - you may need to pass actual user_id here
      // For now, it will use the authenticated user from the backend
      // getLeaveBalance expects a parameter; pass empty string to let server infer authenticated user
      const balancesRes = await getLeaveBalance('');
      if (!balancesRes.ok) {
        const t = await balancesRes.text();
        throw new Error(`Failed to fetch leave balances: ${balancesRes.status} ${balancesRes.statusText}: ${t.slice(0,400)}`);
      }
      const balancesData = await balancesRes.json().catch(async () => {
        const t = await balancesRes.text();
        throw new Error(`Invalid JSON from leave balances: ${t.slice(0,400)}`);
      });
      const resolvedBalances = Array.isArray(balancesData)
        ? balancesData
        : (balancesData?.balances || balancesData?.data || []);
      setBalances(resolvedBalances || []);
    } catch (error) {
      const raw = (error as any)?.message || String(error) || 'Failed to load data';
      console.error('Failed to load data:', raw);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (formData: any) => {
    try {
      const res = await leaveCreate(formData);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to create leave request: ${res.status} ${res.statusText}: ${t.slice(0,400)}`);
      }
      await loadData();
      setShowNewRequest(false);
      alert('Leave request created successfully!');
    } catch (error) {
      const raw = (error as any)?.message || String(error);
      console.error('Failed to create request:', raw);
      alert('Failed to create request: ' + raw);
    }
  };

  const handleAction = async (id: number | string, action: string) => {
    const actionText = action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'cancel';
    if (!confirm(`Are you sure you want to ${actionText} this leave request?`)) {
      return;
    }
    
    try {
      const res = await leavePatch(id, { action });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to ${actionText} leave request: ${res.status} ${res.statusText}: ${t.slice(0,400)}`);
      }
      await loadData();
      alert(`Leave request ${actionText}ed successfully!`);
    } catch (error) {
      alert(`Failed to ${actionText} request: ` + ((error as any)?.message || error));
    }
  };

  const filteredRequests = filterStatus === 'all'
    ? requests
    : requests.filter((r: any) => r.status === filterStatus);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <Ban className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Leave Management</h1>
          <p className="text-slate-600">Manage your time off requests and balances</p>
        </div>

        

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'requests'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Leave Requests
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'balances'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Leave Balances
          </button>
        </div>

        {/* Leave Requests Tab */}
        {activeTab === 'requests' && (
          <div>
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                {['all', 'pending', 'approved', 'rejected'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filterStatus === status
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowNewRequest(true)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                New Request
              </button>
            </div>

            {/* New Request Modal */}
            {showNewRequest && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-slate-900">New Leave Request</h3>
                    <button
                      onClick={() => setShowNewRequest(false)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <LeaveRequestForm
                    onSubmit={handleCreateRequest}
                    onCancel={() => setShowNewRequest(false)}
                  />
                </div>
              </div>
            )}

            {/* Requests List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">No leave requests found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{request.userEmail}</h4>
                          <p className="text-sm text-slate-500">
                            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="text-sm font-medium capitalize">{request.status}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{request.reason}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {calculateDays(request.start_date, request.end_date)} days
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(request.created_at || request.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(request.id, 'approve')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(request.id, 'reject')}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAction(request.id, 'cancel')}
                            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leave Balances Tab */}
        {activeTab === 'balances' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {balances.map(balance => (
              <div key={balance.policy_id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">{balance.policy_name}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Total Allocated</span>
                    <span className="font-semibold text-slate-900">{balance.total_allocated} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Used</span>
                    <span className="font-semibold text-red-600">{balance.total_used} days</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-900 font-medium">Balance</span>
                      <span className="text-2xl font-bold text-indigo-600">{balance.balance_days} days</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-4">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${(balance.balance_days / balance.total_allocated) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 text-center">Year {balance.year}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const LeaveRequestForm: React.FC<{ onSubmit: (f:any)=>void; onCancel: () => void }> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    policy_id: '1'
  });

  const handleSubmit = () => {
    if (!formData.start_date || !formData.end_date || !formData.reason) {
      alert('Please fill in all fields');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
        <input
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
        <input
          type="date"
          value={formData.end_date}
          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
        <textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
          rows={3}
        />
      </div>
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSubmit}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium"
        >
          Submit Request
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default LeaveManagementSystem;