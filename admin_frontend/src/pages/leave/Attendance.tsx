import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Users, TrendingUp, Download, Filter, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getAttendance } from '../../api/leaveApi';
import { getUserBySub } from '../../api/userApi';

// Attendance page using real API data from attendance_logs table
const Attendance: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'IN' | 'OUT'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list');

  // Parse DB timestamp (e.g. '2025-11-17 09:00:00.000') as UTC and return a Date in local timezone
  const parseDbTimestampToLocal = (ts: string | undefined | null) => {
    if (!ts) return null;
    try {
      if (typeof ts === 'string' && ts.match(/^\d{4}-\d{2}-\d{2}T.*Z$/)) {
        // already ISO UTC
        const d = new Date(ts);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      if (typeof ts === 'string' && ts.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
        const iso = ts.replace(' ', 'T') + 'Z';
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      const d2 = new Date(ts as any);
      return Number.isNaN(d2.getTime()) ? null : d2;
    } catch (e) {
      return null;
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend expects a `range` query (start,end) for clock_in filtering.
      // Send full-day UTC range to ensure records for the selected date are included.
      const rangeStart = `${selectedDate}T00:00:00Z`;
      const rangeEnd = `${selectedDate}T23:59:59Z`;
      const res = await getAttendance({ page: 1, size: 500, range: `${rangeStart},${rangeEnd}` });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.content || [];
      // Enrich rows with user profile info (name/email) by resolving user_id (Cognito sub) via authservice
      const distinctSubs = Array.from(new Set((items || []).map((r: any) => r.user_id).filter(Boolean)));
      const profileMap: Record<string, any> = {};
      const batch = distinctSubs.slice(0, 200); // limit to 200 lookups to avoid overload
      await Promise.all(batch.map(async (sub) => {
        try {
          const p = await getUserBySub(String(sub));
          if (p) profileMap[String(sub)] = p;
        } catch (e) {
          // ignore per-user failures
        }
      }));

      // Normalize rows for UI: attendance logs use clock_in/clock_out (not event-type/timestamp)
      const enriched = (items || []).map((it: any) => {
        const clockIn = it.clock_in || it.clockIn || it.created_at || null;
        const clockOut = it.clock_out || it.clockOut || it.updated_at || null;
        const total_hours = (it.total_hours !== undefined && it.total_hours !== null) ? it.total_hours : (it.totalHours ?? null);
        // Determine type for filtering: if there's a clock_out, mark as 'OUT', else 'IN'
        const type = clockOut ? 'OUT' : (clockIn ? 'IN' : 'UNKNOWN');
        return {
          ...it,
          userName: it.userName || it.user_name || (profileMap[it.user_id]?.name || profileMap[it.user_id]?.username || profileMap[it.user_id]?.email || null) || String(it.user_id).slice(0,8),
          userEmail: it.userEmail || it.user_email || (profileMap[it.user_id]?.email || profileMap[it.user_id]?.username || null) || null,
          clockIn,
          clockOut,
          total_hours,
          type,
        };
      });

      setLogs(enriched || []);
      setFilteredLogs(enriched || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedDate]);

  useEffect(() => {
    let filtered = logs;
    if (filterType !== 'all') filtered = filtered.filter(l => l.type === filterType);
    if (searchTerm) {
      filtered = filtered.filter(l => (l.userName || l.user_email || l.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) || (l.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredLogs(filtered);
  }, [logs, filterType, searchTerm]);

  const getStats = () => {
    const uniqueUsers = new Set(logs.map(l => l.user_id)).size;
    const clockIns = logs.filter(l => !!l.clockIn).length;
    const clockOuts = logs.filter(l => !!l.clockOut).length;
    const attendanceRate = uniqueUsers > 0 ? Math.round((clockIns / uniqueUsers) * 100) : 0;
    return { uniqueUsers, clockIns, clockOuts, attendanceRate };
  };

  const getUserSummary = () => {
    const userMap = new Map();
    logs.forEach((log: any) => {
      if (!userMap.has(log.user_id)) {
        userMap.set(log.user_id, { userId: log.user_id, userName: log.userName || log.user_name || 'Unknown User', userEmail: log.userEmail || log.user_email || '', clockIns: [], clockOuts: [] });
      }
      const user = userMap.get(log.user_id);
      if (log.clockIn) user.clockIns.push(log);
      if (log.clockOut) user.clockOuts.push(log);
    });
    return Array.from(userMap.values());
  };

  const calculateWorkHours = (clockIn: any, clockOut: any) => {
    if (!clockIn || !clockOut) return 'N/A';
    const start = parseDbTimestampToLocal(clockIn) || new Date(clockIn);
    const end = parseDbTimestampToLocal(clockOut) || new Date(clockOut);
    if (!start || !end) return 'N/A';
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours.toFixed(2) + ' hrs';
  };

  

  const stats = getStats();
  const userSummary = getUserSummary();

  const handleExport = () => {
    const csv = [
      ['User Name', 'Email', 'Type', 'Time', 'Location'],
      ...filteredLogs.map(log => [
        log.userName || log.user_name || 'Unknown',
        log.userEmail || log.user_email || '',
        log.type,
        `${log.clockIn ? (parseDbTimestampToLocal(log.clockIn) || new Date(log.clockIn)).toLocaleString() : ''}${log.clockOut ? ' - ' + (parseDbTimestampToLocal(log.clockOut) || new Date(log.clockOut)).toLocaleString() : ''}`,
        log.geo_location || log.location || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Attendance Management</h1>
          <p className="text-slate-600">Monitor and manage employee attendance records</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Total Employees</span>
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.uniqueUsers}</p>
            <p className="text-xs text-slate-500 mt-1">Active today</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Clock Ins</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.clockIns}</p>
            <p className="text-xs text-slate-500 mt-1">Logged today</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Clock Outs</span>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.clockOuts}</p>
            <p className="text-xs text-slate-500 mt-1">Logged today</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Attendance Rate</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.attendanceRate}%</p>
            <p className="text-xs text-slate-500 mt-1">Overall rate</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none">
                <option value="all">All Types</option>
                <option value="IN">Clock In Only</option>
                <option value="OUT">Clock Out Only</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setViewMode(viewMode === 'list' ? 'summary' : 'list')} className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-medium text-sm">{viewMode === 'list' ? 'Summary' : 'List'} View</button>
              <button onClick={handleExport} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"><Download className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-xl shadow-md"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" /><p className="text-red-800 font-medium">{error}</p></div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLogs.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No attendance records found</td></tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center"><span className="text-indigo-600 font-semibold text-sm">{(log.userName || log.user_name || '?').charAt(0)}</span></div>
                            <div><p className="font-medium text-slate-900">{log.userName || log.user_name || 'Unknown User'}</p><p className="text-sm text-slate-500">{log.userEmail || log.user_email}</p></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${log.clockOut ? 'bg-green-100 text-green-800 border-green-200' : (log.clockIn ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-gray-100 text-gray-700 border-gray-200')}`}>
                            {log.clockOut ? <CheckCircle className="w-4 h-4 text-green-600" /> : (log.clockIn ? <Clock className="w-4 h-4 text-yellow-600" /> : <AlertCircle className="w-4 h-4 text-gray-500" />)}
                            {log.clockOut ? `Completed (${log.total_hours ?? '—'}h)` : (log.clockIn ? 'Clocked In' : 'N/A')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-700"><Clock className="w-4 h-4 text-slate-400" />
                            {log.clockIn ? (parseDbTimestampToLocal(log.clockIn) ? parseDbTimestampToLocal(log.clockIn)!.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }) : String(log.clockIn)) : 'N/A'}
                            {log.clockOut ? ` — ${parseDbTimestampToLocal(log.clockOut) ? parseDbTimestampToLocal(log.clockOut)!.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }) : String(log.clockOut)}` : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{log.geo_location || log.location || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {userSummary.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center border border-slate-200"><AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" /><p className="text-slate-600">No attendance records found</p></div>
            ) : (
              userSummary.map((user) => (
                <div key={user.userId} className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center"><span className="text-indigo-600 font-semibold text-lg">{user.userName?.charAt(0) || '?'}</span></div>
                      <div><h3 className="font-semibold text-slate-900 text-lg">{user.userName}</h3><p className="text-sm text-slate-500">{user.userEmail}</p></div>
                    </div>
                    <div className="text-right"><p className="text-sm text-slate-600">Total Hours</p><p className="text-xl font-bold text-indigo-600">{calculateWorkHours(user.clockIns[0], user.clockOuts[0])}</p></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm font-medium text-green-800">Clock In</span></div>
                      {user.clockIns.length > 0 ? (<p className="text-lg font-semibold text-green-900">{(() => { const d = parseDbTimestampToLocal(user.clockIns[0].clockIn); return d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : (user.clockIns[0].clockIn ? String(user.clockIns[0].clockIn) : ''); })()}</p>) : (<p className="text-sm text-green-700">Not clocked in</p>)}
                    </div>

                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center gap-2 mb-2"><XCircle className="w-4 h-4 text-red-600" /><span className="text-sm font-medium text-red-800">Clock Out</span></div>
                      {user.clockOuts.length > 0 ? (<p className="text-lg font-semibold text-red-900">{(() => { const d = parseDbTimestampToLocal(user.clockOuts[0].clockOut); return d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : (user.clockOuts[0].clockOut ? String(user.clockOuts[0].clockOut) : ''); })()}</p>) : (<p className="text-sm text-red-700">Not clocked out</p>)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
