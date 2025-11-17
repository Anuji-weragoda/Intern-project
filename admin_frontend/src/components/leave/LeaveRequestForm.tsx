import React, { useState } from 'react';
import { Calendar, Clock, FileText, Briefcase, Send, X } from 'lucide-react';

type Props = {
  onSubmit: (payload: any) => void;
  onCancel?: () => void;
  policies?: Array<{ id: number; policy_name: string; leave_type: string }>;
};

const LeaveRequestForm: React.FC<Props> = ({ onSubmit, onCancel, policies }) => {
  const [policyId, setPolicyId] = useState<number>(() => (policies && policies.length ? policies[0].id : 1));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultLeaveTypes = [
    { id: 1, label: 'Annual Leave', icon: '🏖️', color: 'bg-blue-50 border-blue-200 text-blue-700', type: 'ANNUAL' },
    { id: 2, label: 'Sick Leave', icon: '🏥', color: 'bg-red-50 border-red-200 text-red-700', type: 'SICK' },
    { id: 3, label: 'Unpaid Leave', icon: '📋', color: 'bg-gray-50 border-gray-200 text-gray-700', type: 'UNPAID' },
    { id: 4, label: 'Personal Leave', icon: '👤', color: 'bg-purple-50 border-purple-200 text-purple-700', type: 'PERSONAL' },
    { id: 5, label: 'Maternity Leave', icon: '👶', color: 'bg-pink-50 border-pink-200 text-pink-700', type: 'MATERNITY' },
    { id: 6, label: 'Paternity Leave', icon: '👨‍👧', color: 'bg-indigo-50 border-indigo-200 text-indigo-700', type: 'PATERNITY' }
  ];

  // If `policies` prop is provided, derive the leave types from it so the component
  // actually uses the prop and remains flexible. Otherwise fall back to defaults.
  const leaveTypes = (policies && policies.length)
    ? policies.map(p => ({ id: p.id, label: p.policy_name || p.leave_type || `Policy ${p.id}`, icon: '🏖️', color: 'bg-blue-50 border-blue-200 text-blue-700', type: p.leave_type || 'ANNUAL' }))
    : defaultLeaveTypes;

  const selectedLeaveType = leaveTypes.find(type => type.id === policyId) || leaveTypes[0];

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate || !reason.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert('End date must be after start date');
      return;
    }

    // Prevent creating requests in the past: start date must be today or later
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const todayLocal = new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
    if (startDate < todayLocal) {
      alert('Start date cannot be in the past');
      return;
    }

    setIsSubmitting(true);
    try {
      // Normalize dates to a safe ISO date-only string (YYYY-MM-DD)
      // Build an explicit UTC date to avoid locale parsing differences
      const norm = (d: string) => {
        try {
          // Append time and Z to ensure consistent UTC parsing, then take date portion
          const iso = new Date(d + 'T00:00:00Z').toISOString();
          return iso.slice(0, 10);
        } catch (e) {
          return d;
        }
      };

      const payload = {
        policy_id: policyId,
        start_date: norm(startDate),
        end_date: norm(endDate),
        reason: reason.trim()
      };

      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = calculateDays();
  // Compute today's date (local) in YYYY-MM-DD for use as min on date inputs
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  const todayLocal = new Date(Date.now() - tzOffset).toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Request Time Off</h2>
          <p className="text-sm text-slate-500">Fill in the details for your leave request</p>
          <div className="text-sm text-slate-500 mt-1">
            Selected type: <span className="font-medium text-slate-700 ml-2">{selectedLeaveType.label}</span>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div onSubmit={handleSubmit}>
        {/* Leave Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <Briefcase className="w-4 h-4 inline mr-2" />
            Leave Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {leaveTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setPolicyId(type.id)}
                className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                  policyId === type.id
                    ? `${type.color} border-current shadow-md scale-105`
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow'
                }`}
              >
                <div className="text-xl mb-1">{type.icon}</div>
                <div className="text-xs font-medium">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={todayLocal}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              required
            />
          </div>
        </div>

        {/* Duration Display */}
        {days > 0 && (
          <div className="mb-4 p-3 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
            <div className="flex items-center gap-2 text-indigo-700">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Duration:</span>
              <span className="text-lg font-bold">{days} {days === 1 ? 'day' : 'days'}</span>
            </div>
          </div>
        )}

        {/* Reason */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            Reason for Leave
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
            rows={3}
            placeholder="Please provide a brief explanation for your leave request..."
            required
          />
          <div className="mt-1 text-xs text-slate-500">
            {reason.length}/500 characters
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !startDate || !endDate || !reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Request
              </>
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all font-semibold"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-xs text-slate-600">
          <strong>Note:</strong> Your request will be reviewed by HR. You'll receive a notification once it's been approved or rejected.
        </p>
      </div>
    </div>
  );
};

export default LeaveRequestForm;