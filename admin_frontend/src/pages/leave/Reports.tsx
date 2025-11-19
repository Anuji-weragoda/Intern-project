import React, { useState } from 'react';
import { FileText, Download, Copy, RefreshCw, Calendar, Users, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/ui/ToastProvider';
import { getLeaveSummary } from '../../api/leaveApi';

// Use actual API and real toast provider (no mock)
const Reports: React.FC = () => {
  const [reportStart, setReportStart] = useState<string>('');
  const [reportEnd, setReportEnd] = useState<string>('');
  const [reportTeamId, setReportTeamId] = useState<string>('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [reportRaw, setReportRaw] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<number | null>(null);
  const [reportContentType, setReportContentType] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const toast = useToast();

  // Quick date presets
  const setDatePreset = (preset: string) => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = '';

    switch (preset) {
      case 'week':
        start = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
        break;
      case 'month':
        start = new Date(today.setMonth(today.getMonth() - 1)).toISOString().split('T')[0];
        break;
      case 'quarter':
        start = new Date(today.setMonth(today.getMonth() - 3)).toISOString().split('T')[0];
        break;
      case 'year':
        start = new Date(today.setFullYear(today.getFullYear() - 1)).toISOString().split('T')[0];
        break;
    }

    setReportStart(start);
    setReportEnd(end);
  };

  const generateReport = async () => {
    if (!reportStart || !reportEnd) {
      toast.error('Please select both start and end dates');
      return;
    }

    setReportLoading(true);
    setReportError(null);
    setReportData(null);

    try {
      const range = `${reportStart}T00:00:00Z,${reportEnd}T23:59:59Z`;
      const params: Record<string, any> = { range };
      if (reportTeamId.trim()) params.team_id = reportTeamId.trim();

      const res = await getLeaveSummary(params);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Server error (${res.status}): ${errorText.slice(0, 400)}`);
      }

      const txt = await res.text();
      setReportRaw(txt);
      setReportStatus(res.status);
      setReportContentType(res.headers.get('content-type'));
      setReportUrl((res as any).url || null);
      try {
        const json = JSON.parse(txt);
        setReportData(json);
        toast.success('Report generated successfully');
      } catch {
        // Not JSON — treat as raw/text (CSV)
        setReportData(null);
        toast.success('Report generated (raw format)');
      }
      try {
        // Log response debug info to console to help diagnose incorrect payloads
        // eslint-disable-next-line no-console
        console.debug('[Reports] fetch status:', res.status, 'content-type:', res.headers.get('content-type'), 'url:', (res as any).url);
      } catch (e) {}
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      setReportError(errorMsg);
      toast.error('Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadCSV = () => {
    const txt = reportRaw ?? (typeof reportData === 'string' ? reportData : null);
    if (!txt) return;
    const blob = new Blob([txt], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-report-${reportStart}-to-${reportEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const copyToClipboard = () => {
    if (!reportRaw && !reportData) return;
    const text = reportRaw ?? (reportData ? JSON.stringify(reportData, null, 2) : '');
    navigator.clipboard?.writeText(text);
    toast.success('Copied to clipboard');
  };

  const renderSummaryStats = () => {
    if (!reportData || typeof reportData !== 'object') return null;

    // Extract some example stats (adjust based on your actual data structure)
    const stats = [
      { label: 'Total Records', value: reportData.total || 0, icon: FileText, color: 'bg-blue-100 text-blue-600' },
      { label: 'Teams Analyzed', value: reportData.teams || 1, icon: Users, color: 'bg-purple-100 text-purple-600' },
      { label: 'Leave Days', value: reportData.leaveDays || 0, icon: Calendar, color: 'bg-green-100 text-green-600' },
      { label: 'Avg. Duration', value: reportData.avgDuration || '0d', icon: Clock, color: 'bg-orange-100 text-orange-600' }
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-gradient-to-br from-slate-50 to-white rounded-lg p-4 border border-slate-200">
            <div className={`inline-flex p-2 rounded-lg ${stat.color} mb-2`}>
              <stat.icon size={20} />
            </div>
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">HR Summary Report</h2>
              <p className="text-indigo-100 text-sm">Generate leave & attendance analytics</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Quick Presets */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Quick Date Range</label>
            <div className="flex flex-wrap gap-2">
              {['week', 'month', 'quarter', 'year'].map(preset => (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors capitalize"
                >
                  Last {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Date Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={reportStart}
                onChange={e => setReportStart(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                max={reportEnd || undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={reportEnd}
                onChange={e => setReportEnd(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                min={reportStart || undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Users size={16} className="inline mr-1" />
                Team ID (Optional)
              </label>
              <input
                type="text"
                value={reportTeamId}
                onChange={e => setReportTeamId(e.target.value)}
                placeholder="Enter team UUID"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateReport}
            disabled={reportLoading || !reportStart || !reportEnd}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {reportLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <TrendingUp size={18} />
                Generate Report
              </>
            )}
          </button>

          {/* Error Display */}
          {reportError && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-red-800 mb-1">Error</h4>
                <p className="text-sm text-red-700">{reportError}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {reportData && (
            <div className="mt-6">
              <div className="text-xs text-slate-500 mb-2">Response: {reportStatus ?? '-'} • {reportContentType ?? 'unknown'} {reportUrl ? <span className="ml-2">URL: <code className="text-xs">{reportUrl}</code></span> : null}</div>
              {/* Summary Stats */}
              {typeof reportData === 'object' && renderSummaryStats()}

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-200">
                <div className="flex gap-2">
                  {typeof reportData === 'object' && (
                    <>
                      <button
                        onClick={() => setViewMode('preview')}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          viewMode === 'preview'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => setViewMode('raw')}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          viewMode === 'raw'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Raw JSON
                      </button>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Copy size={16} />
                    Copy
                  </button>
                  {(reportRaw || typeof reportData === 'string') && (
                    <button
                      onClick={downloadCSV}
                      className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <Download size={16} />
                      Download CSV
                    </button>
                  )}
                </div>
              </div>

              {/* Data Display */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <div className="max-h-96 overflow-auto">
                  {typeof reportData === 'string' ? (
                    <pre className="p-4 text-xs font-mono text-slate-700">{reportData}</pre>
                  ) : viewMode === 'raw' ? (
                    <pre className="p-4 text-xs font-mono text-slate-700">
                      {JSON.stringify(reportData, null, 2)}
                    </pre>
                  ) : (
                    <div className="p-4">
                      <div className="text-sm text-slate-600">
                        <p className="font-medium mb-2">Report Summary</p>
                        <p className="text-slate-500">
                          The report has been generated successfully. Switch to "Raw JSON" view to see the complete data structure,
                          or use the Copy/Download buttons to export the data.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!reportData && !reportError && !reportLoading && (
            <div className="mt-8 text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
              <FileText size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No report generated yet</p>
              <p className="text-sm text-slate-400 mt-1">Select a date range and click "Generate Report" to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
