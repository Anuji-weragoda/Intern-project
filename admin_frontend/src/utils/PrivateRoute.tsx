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
    // Redirect to backend OAuth login endpoint; API_BASE_URL falls back to localhost in dev
    redirect(`${API_BASE_URL}/oauth2/authorization/cognito`);
    return null;
  }

  return <>{children}</>;
};

export default PrivateRoute;
