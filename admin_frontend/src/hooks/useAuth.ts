import { useState, useEffect, useCallback } from 'react';
import { authService } from '../api/services/auth.service';
import type { SessionInfo } from '../types/user.types';

export const useAuth = () => {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.getSession();
      setSession(data);
    } catch (err) {
      setSession(null);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = useCallback(() => {
    // Clear local session state immediately
    setSession(null);
    setLoading(false);
    // Then perform backend logout
    authService.logout();
  }, []);

  const refreshSession = useCallback(() => {
    fetchSession();
  }, [fetchSession]);

  return {
    session,
    loading,
    error,
    isAuthenticated: !!session && !!session.isAuthenticated,
    logout,
    refreshSession,
  };
};