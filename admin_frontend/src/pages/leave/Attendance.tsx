import React, { useEffect, useState } from 'react';
import { getAttendance, clockIn, clockOut } from '../../api/leaveApi';

const Attendance: React.FC<{ userId?: number | string }> = ({ userId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Backend expects 1-based page numbering; ensure page starts at 1
      const res = await getAttendance({ user_id: userId, page: 1, size: 50 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.content || [];
      if (!items || items.length === 0) {
        // helpful debug when DB has data but API returned none
        // eslint-disable-next-line no-console
        console.debug('[Attendance] no items returned from API', { userId, raw: data, status: res.status });
      }
      setLogs(items);
    } catch (e: any) {
      setError(e?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  const handleClockIn = async () => {
    try {
      const res = await clockIn({ userId });
      if (!res.ok) throw new Error(`Clock-in failed: ${res.status}`);
      await load();
    } catch (e: any) { alert(e?.message || 'Clock-in error'); }
  };

  const handleClockOut = async () => {
    try {
      const res = await clockOut({ userId });
      if (!res.ok) throw new Error(`Clock-out failed: ${res.status}`);
      await load();
    } catch (e: any) { alert(e?.message || 'Clock-out error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Attendance Logs</h2>
        <div className="flex gap-2">
          <button onClick={handleClockIn} className="px-3 py-1 bg-green-600 text-white rounded">Clock In</button>
          <button onClick={handleClockOut} className="px-3 py-1 bg-red-600 text-white rounded">Clock Out</button>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="space-y-2">
          {logs.length === 0 && <div className="text-gray-600">No attendance logs found</div>}
          {logs.map((l: any) => (
            <div key={l.id || `${l.timestamp}-${Math.random()}`} className="p-3 bg-white rounded border">
              <div className="text-sm text-gray-700">{l.event || (l.type === 'IN' ? 'Clock In' : 'Clock Out')}</div>
              <div className="text-xs text-gray-500">{new Date(l.timestamp || l.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Attendance;
