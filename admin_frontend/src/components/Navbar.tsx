import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Users, FileText, LogOut, LogIn, Home, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';

export const Navbar: React.FC = () => {
  const { session, loading, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/audit-log', label: 'Audit Log', icon: FileText },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = () => {
    // Use your environment variable configuration
    const backendUrl = import.meta.env.REACT_APP_API_URL || 'http://localhost:8081';
    window.location.href = `${backendUrl}/oauth2/authorization/cognito`;
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
  };

  const getUserDisplayName = () => {
    if (!session) return 'User';
    return session.displayName || session.username || session.email?.split('@')[0] || 'User';
  };

  // Don't show navigation if not authenticated
  const showNavigation = !loading && session && isAuthenticated;

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-8">
            <Link
              to={showNavigation ? '/profile' : '/'}
              className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
            >
              <Home className="w-6 h-6" />
              <span className="hidden sm:inline">Staff Management</span>
            </Link>

            {/* Navigation Links - Only show when authenticated */}
            {showNavigation && (
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                        ${
                          isActive(link.path)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
            ) : showNavigation ? (
              <>
                {/* User Dropdown Menu - Only when authenticated */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-gray-900">
                        Hello, {getUserDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500">{session?.email}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 animate-fade-in z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {getUserDisplayName()}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{session?.email}</p>
                      </div>
                      
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        My Profile
                      </Link>

                      {/* Mobile Navigation Links */}
                      <div className="md:hidden border-t border-gray-100 mt-2 pt-2">
                        {navLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <Link
                              key={link.path}
                              to={link.path}
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Icon className="w-4 h-4" />
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Login Button - Only when NOT authenticated
              <Button
                variant="primary"
                size="sm"
                onClick={handleLogin}
                icon={<LogIn className="w-4 h-4" />}
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};