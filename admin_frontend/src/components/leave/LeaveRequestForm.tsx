import React, { useState } from 'react';

type Props = {
  onSubmit: (payload: any) => void;
};

const LeaveRequestForm: React.FC<Props> = ({ onSubmit }) => {
  const [leaveType, setLeaveType] = useState('ANNUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ leaveType, start_date: startDate, end_date: endDate, reason });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Leave Type</label>
          <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full border rounded p-2">
            <option value="ANNUAL">Annual</option>
            <option value="SICK">Sick</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded p-2" />
        </div>
      </div>
      <div className="mt-3">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Submit Request</button>
      </div>
    </form>
  );
};

export default LeaveRequestForm;
