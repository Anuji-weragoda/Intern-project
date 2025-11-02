import React, { createContext, useEffect, useState } from "react";
import authService from "../services/authService";
import type { User } from "../services/authService";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    setLoading(true);
    try {
      const u = await authService.getSession();
      setUser(u);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Localhost-only E2E bypass: set user synchronously to avoid redirect races
    try {
      const host = window.location?.hostname || '';
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      const bypass = typeof localStorage !== 'undefined' ? localStorage.getItem('E2E_BYPASS_AUTH') : null;
      if (isLocal && bypass === '1') {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('E2E_USER') : null;
        const mock: User = raw ? JSON.parse(raw) : { username: 'e2e', displayName: 'E2E User', email: 'e2e@example.com', roles: ['ADMIN'] } as any;
        setUser(mock);
        setLoading(false);
        return;
      }
    } catch {}

    refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doLogout = async () => {
    // Submit backend logout first to avoid SPA races (e.g., PrivateRoute redirecting to login)
    // The browser will navigate away immediately via a form POST to /logout
    try {
      await authService.logout();
    } catch (e) {
      // Backend redirect will take over; no need to manipulate local state here
    }
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    refreshSession,
    logout: doLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthContext() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
