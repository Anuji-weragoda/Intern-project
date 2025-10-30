import React from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { API_BASE_URL } from "../api/index";

const Navbar: React.FC = () => {
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="bg-indigo-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="text-2xl font-bold">Staff Management</div>
          <div className="space-x-4">
            {!loading && user ? (
              <>
                <span>Hello, {user.displayName || user.email || user.username}</span>
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
                href={`${API_BASE_URL}/oauth2/authorization/cognito`}
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
