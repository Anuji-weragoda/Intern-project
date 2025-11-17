import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Ban, Plus, X, AlertCircle, User, FileText } from 'lucide-react';
import {
  getLeaveRequests,
  createLeaveRequest as leaveCreate,
  patchLeaveRequest as leavePatch,
  getRawLeaveBalances,
} from '../../api/leaveApi';
import LeaveRequestForm from '../../components/leave/LeaveRequestForm';
import { getUserBySub } from '../../api/userApi';

const LeaveManagementSystem = () => {
  const [requests, setRequests] = useState<any[]>([]);
  // legacy balances state removed; we use `usersBalances` (report) instead
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentUser, setCurrentUser] = useState<{ id?: string; email?: string } | null>(null);
  const [rawBalances, setRawBalances] = useState<Array<any>>([]);
  const [loadingUsersBalances, setLoadingUsersBalances] = useState(false);

  useEffect(() => {
    loadData();
    // Decode token once on mount to get current user info for fallbacks
    try {
      const keys = ['jwt_token', 'id_token', 'access_token', 'token'];
      let token: string | null = null;
      for (const k of keys) {
        try {
          const v = localStorage.getItem(k);
          if (v && v.length > 20) { token = v; break; }
        } catch (e) {}
        try {
          const v2 = sessionStorage.getItem(k);
          if (v2 && v2.length > 20) { token = v2; break; }
        } catch (e) {}
      }
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const payloadJson = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            // Debug token payload to help diagnose missing claims
            try { console.debug('[LeaveRequests] decoded token payload:', payloadJson); } catch (e) {}
            const id = payloadJson.sub || payloadJson.user_id || payloadJson.userId || payloadJson['cognito:username'] || payloadJson.username || payloadJson['custom:sub'];
            const email = payloadJson.email || payloadJson['cognito:email'] || payloadJson.preferred_username || payloadJson.username || payloadJson['email_address'] || null;
            setCurrentUser({ id, email });
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {}
  }, []);

  // When balances tab is opened, fetch raw leave_balances rows from the server
  useEffect(() => {
    if (activeTab !== 'balances') return;
    let mounted = true;
    const fetchAllUserBalances = async () => {
      setLoadingUsersBalances(true);
      try {
        // Prefer a raw dump endpoint that returns rows from `leave_balances`.
        try {
          const res = await getRawLeaveBalances({ limit: 200 });
          if (res && res.ok) {
            const j = await res.json().catch(() => null);
            const rows = Array.isArray(j) ? j : (j?.data || j?.rows || []);
            if (mounted) { setRawBalances(rows || []); return; }
          }
        } catch (e) {
          // endpoint missing or errored
        }
        // If the raw endpoint is not available, set empty
        if (mounted) setRawBalances([]);
      } catch (e) {
        if (mounted) setRawBalances([]);
      } finally {
        if (mounted) setLoadingUsersBalances(false);
      }
    };
    fetchAllUserBalances();
    return () => { mounted = false; };
  }, [activeTab]);

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

      // Resolve missing user emails by querying the authservice for distinct missing user IDs
      try {
        const missingIds = new Set<string>();
        for (const r of (resolvedRequests || [])) {
          const userId = r.user_id || r.userId || r.requester_id || r.user?.id || r.user?.sub || null;
          const approverId = r.approver_id || r.approverId || r.approver?.id || r.approver?.sub || null;
          const userEmail = r.userEmail || r.user_email || r.email || r.requester_email || r.user?.email || r.user?.username || null;
          const approverEmail = r.approverEmail || r.approver_email || r.approver?.email || null;
          if (userId && !userEmail) missingIds.add(String(userId));
          if (approverId && !approverEmail) missingIds.add(String(approverId));
        }
        if (missingIds.size > 0) {
          // fetch profiles in parallel (limited to N)
          const ids = Array.from(missingIds).slice(0, 20);
          const promises = ids.map(id => getUserBySub(id).catch(() => null));
          const results = await Promise.all(promises);
          const map: Record<string, any> = {};
          results.forEach((r, i) => { if (r) map[ids[i]] = r; });
          if (Object.keys(map).length > 0) {
            const patched = (resolvedRequests || []).map((r: any) => {
              const uid = String(r.user_id || r.userId || r.requester_id || r.user?.id || r.user?.sub || '');
              const aid = String(r.approver_id || r.approverId || r.approver?.id || r.approver?.sub || '');
              let out = { ...r };
              if (uid && map[uid] && ! (r.userEmail || r.user_email || r.email || r.requester_email || r.user?.email)) {
                const email = map[uid].email || map[uid].username || map[uid].userEmail || map[uid].email_address || null;
                out = { ...out, userEmail: email };
              }
              if (aid && map[aid] && ! (r.approverEmail || r.approver_email || r.approver?.email)) {
                const aemail = map[aid].email || map[aid].username || map[aid].userEmail || map[aid].email_address || null;
                out = { ...out, approverEmail: aemail };
              }
              return out;
            });
            setRequests(patched || []);
          }
        }
      } catch (e) {
        // ignore errors resolving user profiles
      }
      
      // Fetch raw leave_balances rows for the balances tab
      try {
        const res = await getRawLeaveBalances({ limit: 200 });
        if (res && res.ok) {
          const j = await res.json().catch(() => null);
          const rows = Array.isArray(j) ? j : (j?.data || j?.rows || []);
          setRawBalances(rows || []);
        } else {
          try { const txt = await (res ? res.clone().text() : Promise.resolve('no-response')); console.warn('[LeaveRequests] raw-leave-balances unavailable:', res ? `${res.status} ${res.statusText}` : 'no response', txt.slice ? txt.slice(0,400) : txt); } catch (e) {}
          setRawBalances([]);
        }
      } catch (e) {
        console.warn('[LeaveRequests] error fetching raw leave_balances:', (e as any)?.message || e);
        setRawBalances([]);
      }
    } catch (error) {
      console.error('Failed to load data:', (error as any)?.message || error);
      // non-blocking: log a warning but don't interrupt the user with an alert
      console.warn('Failed to load leave data; check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (formData: any) => {
    try {
      // Ensure user id (uuid) is present. Try to extract from a stored JWT if missing.
      const payload = { ...formData } as any;
      // Map leaveType to policy_id if provided by the form component
      if (!payload.policy_id && payload.leaveType) {
        const map: Record<string, number> = { ANNUAL: 1, SICK: 2, UNPAID: 3, PERSONAL: 4, MATERNITY: 5, PATERNITY: 6 };
        const pid = map[payload.leaveType as string];
        if (pid) payload.policy_id = pid;
      }
      if (!payload.user_id) {
        const token = (() => {
          try {
            const keys = ['jwt_token', 'id_token', 'access_token', 'token'];
            for (const k of keys) {
              try {
                const v = localStorage.getItem(k);
                if (v && v.length > 20) return v;
              } catch (e) {}
              try {
                const v2 = sessionStorage.getItem(k);
                if (v2 && v2.length > 20) return v2;
              } catch (e) {}
            }
            // cookies
            try {
              const cookies = document.cookie ? document.cookie.split(';') : [];
              for (const c of cookies) {
                const [name, ...rest] = c.trim().split('=');
                const value = rest.join('=');
                if (['jwt_token','id_token','access_token','token'].includes(name) && value) {
                  return decodeURIComponent(value);
                }
              }
            } catch (e) {}
          } catch (e) {}
          return null;
        })();

        if (token) {
          try {
            const parts = token.split('.');
            if (parts.length >= 2) {
              const payloadJson = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
              const sub = payloadJson.sub || payloadJson.user_id || payloadJson.username || payloadJson['cognito:username'];
              if (sub) payload.user_id = sub;
            }
          } catch (e) {
            // ignore decode errors
            console.warn('Could not decode JWT to extract user id', e);
          }
        }
      }

      // Log final payload for debugging
      try { console.debug('[LeaveRequests] creating leave with payload:', payload); } catch (e) {}

      const res = await leaveCreate(payload);
      if (!res.ok) {
        const t = await res.text();
        console.error('[LeaveRequests] create response body:', t);
        throw new Error(`Failed to create leave request: ${res.status} ${res.statusText}: ${t.slice(0,400)}`);
      }
      await loadData();
      setShowNewRequest(false);
      alert('Leave request created successfully!');
    } catch (error) {
      alert('Failed to create request: ' + ((error as any)?.message || error));
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

  // Parse timestamps returned by the DB (which may be in 'YYYY-MM-DD HH:mm:ss.SSS' form)
  // Treat such timestamps as UTC and convert to a local Date for display.
  const parseDbTimestampToLocal = (ts: string | undefined | null) => {
    if (!ts) return null;
    try {
      // If string contains a space between date and time (Postgres default), convert to ISO and append Z to mark UTC
      if (typeof ts === 'string' && ts.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
        const iso = ts.replace(' ', 'T') + 'Z';
        const d = new Date(iso);
        if (!Number.isNaN(d.getTime())) return d;
      }
      // Fallback: let Date attempt to parse
      const d2 = new Date(ts as any);
      if (!Number.isNaN(d2.getTime())) return d2;
    } catch (e) {
      // ignore
    }
    return null;
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
                          {(() => {
                            const userEmail = request.userEmail || request.user_email || request.email || request.requester_email || request.user?.email || request.user?.username || '';
                            const userId = request.user_id || request.userId || request.requester_id || request.user?.id || request.user?.sub || '';
                            // If email is missing but the request belongs to current user, use the id token email as fallback
                            const resolvedEmail = userEmail || ((currentUser && currentUser.id && userId && String(currentUser.id) === String(userId)) ? (currentUser.email || '') : '');
                            return (
                              <>
                                <h4 className="font-semibold text-slate-900">{resolvedEmail || 'Unknown user'}</h4>
                                {userId && <div className="text-xs text-slate-400">ID: {String(userId)}</div>}
                              </>
                            );
                          })()}
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
                      {request.status === 'approved' && (
                        <div className="mt-2 text-sm text-slate-600">
                          <strong>Approved by:</strong> {request.approverEmail || request.approver_email || request.approver_id || request.approver || 'Unknown'}
                          { (request.approved_at || request.updated_at || request.updatedAt) && (
                            (() => {
                              const ts = request.approved_at || request.updated_at || request.updatedAt;
                              const d = parseDbTimestampToLocal(ts);
                              return (<span className="ml-3 text-xs text-slate-500">on {d ? d.toLocaleString() : String(ts)}</span>);
                            })()
                          )}
                        </div>
                      )}

                      {request.status === 'rejected' && (
                        <div className="mt-2 text-sm text-slate-600">
                          <strong>Rejected by:</strong> {request.approverEmail || request.approver_email || request.approver_id || request.approver || 'Unknown'}
                          { (request.approved_at || request.updated_at || request.updatedAt) && (
                            (() => {
                              const ts = request.approved_at || request.updated_at || request.updatedAt;
                              const d = parseDbTimestampToLocal(ts);
                              return (<span className="ml-3 text-xs text-slate-500">on {d ? d.toLocaleString() : String(ts)}</span>);
                            })()
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {calculateDays(request.start_date, request.end_date)} days
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {(() => {
                            const createdTs = request.created_at || request.createdAt || request.updated_at || request.updatedAt;
                            const cd = parseDbTimestampToLocal(createdTs);
                            return cd ? cd.toLocaleDateString() : (createdTs ? String(createdTs).slice(0,10) : '');
                          })()}
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
          <div>
            {loadingUsersBalances ? (
              <div className="col-span-full text-center py-8">Loading user balances...</div>
            ) : rawBalances && rawBalances.length > 0 ? (
              <div className="overflow-x-auto bg-white rounded border">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="px-4 py-2">ID</th>
                      <th className="px-4 py-2">User ID</th>
                      <th className="px-4 py-2">Policy ID</th>
                      <th className="px-4 py-2">Allocated</th>
                      <th className="px-4 py-2">Used</th>
                      <th className="px-4 py-2">Balance</th>
                      <th className="px-4 py-2">Year</th>
                      <th className="px-4 py-2">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawBalances.map((bal: any) => (
                      <tr key={bal.id} className="border-t">
                        <td className="px-4 py-2">{bal.id}</td>
                        <td className="px-4 py-2">{bal.user_id}</td>
                        <td className="px-4 py-2">{bal.policy_id}</td>
                        <td className="px-4 py-2">{bal.total_allocated ?? 0}</td>
                        <td className="px-4 py-2">{bal.total_used ?? 0}</td>
                        <td className="px-4 py-2">{bal.balance_days ?? ((bal.total_allocated || 0) - (bal.total_used || 0))}</td>
                        <td className="px-4 py-2">{bal.year ?? ''}</td>
                        <td className="px-4 py-2">{(() => { const d = parseDbTimestampToLocal(bal.created_at); return d ? d.toLocaleString() : (bal.created_at ? String(bal.created_at) : ''); })()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
                <p className="text-slate-600">No leave balances available. Ensure the `raw-leave-balances` endpoint is deployed on the server.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Using shared `LeaveRequestForm` component from `src/components/leave/LeaveRequestForm`

export default LeaveManagementSystem;