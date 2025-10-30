import React, { useEffect, useState } from "react";

interface AdminUser {
  id: number;
  email: string;
  username?: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

interface SpringPageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  number: number;
  size: number;
  empty: boolean;
}

// PRODUCTION-READY JWT TOKEN GETTER
const getJWT = (): string | null => {
  console.log('Looking for JWT token...');
  
  // 1. Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('jwt') || urlParams.get('token');
  if (urlToken && urlToken.length > 20) {
    localStorage.setItem('jwt_token', urlToken);
    window.history.replaceState({}, '', window.location.pathname);
    console.log('✅ Token from URL saved!');
    return urlToken;
  }

  // 2. Check localStorage (all possible keys)
  const storageKeys = ['jwt_token', 'id_token', 'access_token', 'token'];
  for (const key of storageKeys) {
    const token = localStorage.getItem(key);
    if (token && token.length > 20) {
      localStorage.setItem('jwt_token', token); // Normalize to jwt_token
      console.log(`✅ Token from localStorage (${key})!`);
      return token;
    }
  }

  // 3. Check sessionStorage
  for (const key of storageKeys) {
    const token = sessionStorage.getItem(key);
    if (token && token.length > 20) {
      localStorage.setItem('jwt_token', token);
      console.log(`✅ Token from sessionStorage (${key})!`);
      return token;
    }
  }

  // 4. Check cookies
  const cookies = document.cookie.split(';');
  console.log('🍪 Checking cookies:', document.cookie);
  
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (storageKeys.includes(name) && value && value.length > 20) {
      const token = decodeURIComponent(value);
      localStorage.setItem('jwt_token', token);
      console.log(`✅ Token from cookie (${name}) saved!`);
      return token;
    }
  }

  console.error('❌ NO TOKEN FOUND!');
  console.error('Available cookies:', document.cookie);
  console.error('Available localStorage:', Object.keys(localStorage));
  return null;
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setDebugInfo("Getting JWT token...");

      const token = getJWT();

      if (!token) {
        setError("No authentication token found. Please log in via Cognito.");
        setDebugInfo("❌ No token found");
        setLoading(false);
        return;
      }


      try {
        const response = await fetch(
          "http://localhost:8081/api/v1/admin/users?page=0&size=20",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            credentials: "include",
          }
        );

        setDebugInfo(`Response: ${response.status}`);

        // Handle 401 - Token expired
        if (response.status === 401) {
          console.error('Token expired - clearing storage');
          localStorage.clear();
          sessionStorage.clear();
          setError("Your session has expired. Please log in again.");
          setDebugInfo("❌ Session expired");
          // Redirect to login after 2 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
          setLoading(false);
          return;
        }

        // Handle 403 - No permission
        if (response.status === 403) {
          setError("Access denied. Your account doesn't have ADMIN privileges in Cognito.");
          setDebugInfo("❌ 403 Forbidden");
          setLoading(false);
          return;
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Server error (${response.status}): ${text}`);
        }

        const data: SpringPageResponse<AdminUser> = await response.json();

        if (Array.isArray(data.content)) {
          setUsers(data.content);
          setDebugInfo(`✅ SUCCESS! Loaded ${data.content.length} users`);
        } else {
          throw new Error("Invalid data structure from server");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Error fetching users:", err);
        setError(msg);
        setDebugInfo(`❌ Error: ${msg}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRoles: string[]) => {
    const token = getJWT();
    
    if (!token) {
      alert("❌ No authentication token! Please log in again.");
      window.location.href = '/';
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8081/api/v1/admin/users/${userId}/roles`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ addRoles: newRoles, removeRoles: [] }),
        }
      );

      if (response.status === 401) {
        localStorage.clear();
        sessionStorage.clear();
        alert("❌ Session expired. Please log in again.");
        window.location.href = '/';
        return;
      }

      if (response.status === 403) {
        alert("❌ Access denied. You don't have permission to modify roles.");
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed (${response.status}): ${text}`);
      }

      // Update local state
      setUsers(users.map(u => (u.id === userId ? { ...u, roles: newRoles } : u)));
      alert("✅ Roles updated successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Error updating roles:", err);
      alert("❌ Failed to update roles: " + msg);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">User Management</h2>
      
      {/* Debug information (only shown when present) */}
      {debugInfo && (
        <div className="mb-4 text-sm text-gray-600">
          <strong>Debug:</strong> {debugInfo}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-300 rounded p-4 mb-4">
          <p className="text-red-700 font-semibold">⚠️ ERROR:</p>
          <p className="text-red-600 mb-3">{error}</p>
          <div className="mt-3 text-sm bg-white p-3 rounded border">
            <p className="font-semibold mb-2">Troubleshooting:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Make sure you're logged in via Cognito OAuth2</li>
              <li>Your user must be in the <code className="bg-gray-100 px-1">ADMIN</code> group in Cognito</li>
              <li>Check backend logs for "✅ TOKEN EXTRACTED!"</li>
              <li>Try logging out and logging back in</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && users.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded p-4">
          <p className="text-yellow-700">⚠️ No users found in the system.</p>
        </div>
      )}

      {/* Users Table */}
      {!loading && !error && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Username</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Roles</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{user.id}</td>
                  <td className="border border-gray-300 px-4 py-2">{user.email}</td>
                  <td className="border border-gray-300 px-4 py-2">{user.username || "-"}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    {user.roles.length > 0 ? user.roles.join(", ") : "No roles"}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 mr-2 text-sm"
                      onClick={() => handleRoleChange(user.id, ["ADMIN"])}
                    >
                      Make Admin
                    </button>
                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                      onClick={() => handleRoleChange(user.id, ["USER"])}
                    >
                      Remove Admin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserManagement;