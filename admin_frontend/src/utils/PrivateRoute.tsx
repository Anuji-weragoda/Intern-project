import { useEffect, useState } from "react";

type PrivateRouteProps = {
  children: React.ReactNode;
};

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((res) => setIsAuthenticated(res.status === 200))
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) return <div className="p-8 text-gray-600">Checking session...</div>;

  if (!isAuthenticated) {
    window.location.href = "/oauth2/authorization/cognito";
    return null;
  }

  return <>{children}</>;
};

export default PrivateRoute;
