import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { API_BASE_URL } from "../api/index";
import {
  User,
  LogOut,
  Users,
  ClipboardList,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
} from "lucide-react";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}

const Navbar: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();

  // Logout is handled by dedicated /logout route to avoid event/routing races

  const isActivePath = (path: string) => location.pathname === path;

  const NavLink: React.FC<NavLinkProps> = ({ to, children, icon: Icon }) => (
    <Link
      to={to}
      className={`${
        isActivePath(to)
          ? "text-blue-600 bg-blue-50 shadow-sm"
          : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
      } flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group`}
      onClick={() => setIsMobileMenuOpen(false)}
    >
      <Icon
        className={`w-4 h-4 ${
          isActivePath(to)
            ? "text-blue-600"
            : "text-gray-500 group-hover:text-blue-600"
        } transition-colors`}
      />
      {children}
    </Link>
  );

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 rounded-xl flex items-center justify-center transform transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 shadow-lg group-hover:shadow-xl">
                  <span className="text-white font-bold text-xl">S</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl blur-md opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-indigo-600 transition-all duration-300">
                  Staff MS
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  Management System
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-2">
            {!loading && user ? (
              <>
                <div className="flex items-center gap-1 mr-4">
                  <NavLink to="/dashboard" icon={LayoutDashboard}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/admin/users" icon={Users}>
                    Users
                  </NavLink>
                  <NavLink to="/admin/audit-log" icon={ClipboardList}>
                    Audit Log
                  </NavLink>
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-3 pl-4 pr-3 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200 group border border-transparent hover:border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-semibold text-gray-900">
                          {user.displayName || "User"}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        isProfileOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsProfileOpen(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200/60 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <User className="w-4 h-4 text-gray-500" />
                          View Profile
                        </Link>
                        <hr className="my-2 border-gray-200" />
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            setIsProfileOpen(false);
                            try {
                              await logout();
                            } catch {
                              // navigation will be handled by backend redirect
                            }
                          }}
                          className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <a
                href={`${API_BASE_URL}/oauth2/authorization/cognito`}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <User className="w-4 h-4" />
                Sign in
              </a>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-200"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`${
          isMobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        } md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-gray-200/60 bg-gradient-to-b from-gray-50 to-white`}
      >
        <div className="px-4 pt-4 pb-6 space-y-2">
          {user ? (
            <>
              <div className="px-4 py-3 mb-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {user.displayName || "User"}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>

              <NavLink to="/profile" icon={User}>
                Profile
              </NavLink>
              <NavLink to="/dashboard" icon={LayoutDashboard}>
                Dashboard
              </NavLink>
              <NavLink to="/admin/users" icon={Users}>
                Users
              </NavLink>
              <NavLink to="/admin/audit-log" icon={ClipboardList}>
                Audit Log
              </NavLink>

              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  try {
                    await logout();
                  } catch {
                    // backend redirect will take over
                  }
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 mt-4"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          ) : (
            <a
              href={`${API_BASE_URL}/oauth2/authorization/cognito`}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all duration-200 shadow-md"
            >
              <User className="w-4 h-4" />
              Sign in
            </a>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;