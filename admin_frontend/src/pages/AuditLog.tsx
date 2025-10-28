import React, { useEffect, useState } from "react";

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

// GET JWT TOKEN from URL or cookies
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

  useEffect(() => {
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
        console.log("✅ Audit logs received:", data);
        console.log("Total logs:", data.length);

        if (Array.isArray(data)) {
          const transformedLogs: Audit[] = data.map((log: any) => ({
            id: log.id,
            cognitoSub: log.cognitoSub || "N/A",  // Use from DTO directly
            userId: log.userId || 0,              // Use from DTO directly
            email: log.email || "N/A",            // Use from DTO directly
            eventType: log.eventType || "UNKNOWN",
            ipAddress: log.ipAddress || "N/A",
            success: log.success ?? true,
            failureReason: log.failureReason || undefined,
            userAgent: log.userAgent || "N/A",
            createdAt: log.createdAt || "N/A",
          }));
          setLogs(transformedLogs);
        } else {
          console.error("Data is not an array:", data);
          setError("Invalid response format from server");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to fetch audit logs:", err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="p-6 max-w-full">
      <h1 className="text-3xl font-bold mb-6">Audit Log</h1>

      {loading && (
        <div className="text-center py-12">
          <div className="text-gray-600 text-lg">
            ⏳ Loading audit logs...
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded p-4 mb-6">
          <p className="text-red-700 font-semibold text-lg">❌ Error</p>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded p-4">
          <p className="text-yellow-800 font-medium">ℹ️ No audit logs found</p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-gray-700">
              Showing{" "}
              <span className="font-bold text-lg">{logs.length}</span> audit
              log{logs.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-blue-500 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Cognito Sub</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">User ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Event Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">IP Address</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Success</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Failure Reason</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">User Agent</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">{log.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.cognitoSub}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.userId}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.email}</td>
                    <td className="px-4 py-3 text-sm">{log.eventType}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{log.ipAddress}</td>
                    <td className="px-4 py-3 text-sm">{log.success ? "✅" : "❌"}</td>
                    <td className="px-4 py-3 text-sm text-red-600">{log.failureReason || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <div className="truncate" title={log.userAgent}>{log.userAgent}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{log.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
