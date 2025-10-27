import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Define the type for user data
interface User {
  displayName?: string;
  email?: string;
}

const Navbar: React.FC = () => {
  const [user, setUser] = useState<{ displayName: string; email: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch current session/user
  const fetchSession = async () => {
    try {
      const res = await fetch("http://localhost:8081/api/v1/me/session", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Not authenticated");
      const data = await res.json();
      setUser({
      displayName: data.displayName || data.username || data.email || "User",
      email: data.email,
    });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  // Logout handler
  const handleLogout = () => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "http://localhost:8081/logout";
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <nav className="bg-indigo-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="text-2xl font-bold">Staff Management</div>
          <div className="space-x-4">
            {!loading && user ? (
              <>
                <span>Hello, {user.displayName || user.email}</span>
                <Link
                  to="/profile"
                  className="hover:bg-indigo-700 px-3 py-2 rounded-md"
                >
                  Profile
                </Link>
                <Link
                  to="/admin/users"
                  className="hover:bg-indigo-700 px-3 py-2 rounded-md"
                >
                  Users
                </Link>
                <Link
                  to="/admin/audit-log"
                  className="hover:bg-indigo-700 px-3 py-2 rounded-md"
                >
                  Audit Log
                </Link>
                <button
                  onClick={handleLogout}
                  className="hover:bg-indigo-700 px-3 py-2 rounded-md"
                >
                  Logout
                </button>
              </>
            ) : (
              <a
                href="http://localhost:8081/oauth2/authorization/cognito"
                className="hover:bg-indigo-700 px-3 py-2 rounded-md"
              >
                Login
              </a>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
