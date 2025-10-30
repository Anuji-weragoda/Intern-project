import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Filter, Download, RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface Audit {
  id: number;
  cognitoSub: string;
  userId: number;
  email: string;
  eventType: string;
  ipAddress: string;
  success: boolean;
  failureReason?: string;
  userAgent: string;
  createdAt: string;
}

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

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [successFilter, setSuccessFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    const token = getJWT();

    if (!token) {
      setError("No JWT token found! Please log in via Cognito.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8081/api/v1/admin/audit-log",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        }
      );

      if (response.status === 403) {
        setError("403 Forbidden - Admin access required!");
        setLoading(false);
        return;
      }

      if (response.status === 401) {
        setError("401 Unauthorized - Please log in again!");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        const transformedLogs: Audit[] = data.map((log: any) => ({
          id: log.id,
          cognitoSub: log.cognitoSub || "N/A",
          userId: log.userId || 0,
          email: log.email || "N/A",
          eventType: log.eventType || "UNKNOWN",
          ipAddress: log.ipAddress || "N/A",
          success: log.success ?? true,
          failureReason: log.failureReason || undefined,
          userAgent: log.userAgent || "N/A",
          createdAt: log.createdAt || "N/A",
        }));
        setLogs(transformedLogs);
      } else {
        setError("Invalid response format from server");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const eventTypes = Array.from(new Set(logs.map(log => log.eventType)));

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.cognitoSub.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEventType = !eventTypeFilter || log.eventType === eventTypeFilter;
    const matchesSuccess = !successFilter || 
      (successFilter === "success" && log.success) ||
      (successFilter === "failure" && !log.success);

    return matchesSearch && matchesEventType && matchesSuccess;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, eventTypeFilter, successFilter, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getEventTypeColor = (eventType: string) => {
    const colors: { [key: string]: string } = {
      LOGIN: "bg-blue-100 text-blue-800",
      LOGOUT: "bg-gray-100 text-gray-800",
      CREATE: "bg-green-100 text-green-800",
      UPDATE: "bg-yellow-100 text-yellow-800",
      DELETE: "bg-red-100 text-red-800",
      ACCESS: "bg-purple-100 text-purple-800",
    };
    return colors[eventType] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
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

  const exportToCSV = () => {
    const headers = ["ID", "Email", "Event Type", "IP Address", "Success", "Failure Reason", "Created At"];
    const csvData = filteredLogs.map(log => [
      log.id,
      log.email,
      log.eventType,
      log.ipAddress,
      log.success ? "Success" : "Failure",
      log.failureReason || "-",
      log.createdAt
    ]);
    
    const csv = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-gray-900">Audit Log</h1>
            <button
              onClick={fetchLogs}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          <p className="text-gray-600">Track and monitor system activities across your organization</p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
              <p className="text-gray-600 text-lg">Loading audit logs...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500 mb-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error Loading Logs</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <Filter className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Audit Logs Found</h3>
              <p className="text-gray-600">There are no logs to display at this time.</p>
            </div>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
                <div className="text-sm text-gray-600 mb-1">Total Logs</div>
                <div className="text-3xl font-bold text-gray-900">{logs.length}</div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500">
                <div className="text-sm text-gray-600 mb-1">Successful</div>
                <div className="text-3xl font-bold text-green-600">
                  {logs.filter(l => l.success).length}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-500">
                <div className="text-sm text-gray-600 mb-1">Failed</div>
                <div className="text-3xl font-bold text-red-600">
                  {logs.filter(l => !l.success).length}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-purple-500">
                <div className="text-sm text-gray-600 mb-1">Unique Users</div>
                <div className="text-3xl font-bold text-purple-600">
                  {new Set(logs.map(l => l.email)).size}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by email, event, IP, or Cognito Sub..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                  >
                    <option value="">All Events</option>
                    {eventTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={successFilter}
                    onChange={(e) => setSuccessFilter(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{startIndex + 1}-{Math.min(endIndex, filteredLogs.length)}</span> of <span className="font-semibold text-gray-900">{filteredLogs.length}</span> results
                </div>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEventTypeColor(log.eventType)}`}>
                              {log.eventType}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{log.email}</div>
                          <div className="text-xs text-gray-500">ID: {log.userId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {log.success ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-sm font-medium text-green-700">Success</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span className="text-sm font-medium text-red-700">Failed</span>
                              </>
                            )}
                          </div>
                          {log.failureReason && (
                            <div className="text-xs text-red-600 mt-1">{log.failureReason}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-700">{log.ipAddress}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(log.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-500 max-w-xs truncate" title={log.userAgent}>
                            {log.userAgent}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Sub: {log.cognitoSub.substring(0, 20)}...</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Rows per page:</label>
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;