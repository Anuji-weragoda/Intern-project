import React from "react";
import useAuth from "../hooks/useAuth";
import { API_BASE_URL } from "../api/index";
import { redirect } from "./navigation";

type PrivateRouteProps = {
  children: React.ReactNode;
};

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div className="p-8 text-gray-600">Checking session...</div>;

  if (!isAuthenticated) {
    // Localhost-only E2E bypass: when a test flag is present, allow rendering without real auth
    try {
      const host = window.location?.hostname || '';
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      const bypass = typeof localStorage !== 'undefined' ? localStorage.getItem('E2E_BYPASS_AUTH') : null;
      if (isLocal && bypass === '1') {
        return <>{children}</>;
      }
    } catch {}

    // Redirect to backend OAuth login endpoint; API_BASE_URL falls back to localhost in dev
    redirect(`${API_BASE_URL}/oauth2/authorization/cognito`);
    return null;
  }

  return <>{children}</>;
};

export default PrivateRoute;
