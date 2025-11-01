import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import UserManagement from "./pages/UserManagement";
import Unauthorized from "./pages/Unauthorized";
import AuditLog from "./pages/AuditLog";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./utils/PrivateRoute";
import useAuth from "./hooks/useAuth";

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, refreshSession, loading } = useAuth();
  // Show navbar on all pages except unauthenticated home page and the unauthorized page
  // Keep behavior where authenticated users see navbar on the home page
  const showNavbar = location.pathname !== "/unauthorized" && (location.pathname !== "/" || isAuthenticated);

  // Clean ?jwt from the URL if backend added it, but do not store it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("jwt")) {
      params.delete("jwt");
      const newSearch = params.toString();
      const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", newUrl);
      // Proactively refresh session now that login completed
      // Delay to allow session cookie to be available, then refresh session
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        refreshSession();
      }, 0);
    }
  }, [refreshSession]);

  // After successful login, automatically go to dashboard from home
  useEffect(() => {
    if (isAuthenticated && !loading && location.pathname === "/") {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, location.pathname, navigate]);

  return (
    <>
      {showNavbar && <Navbar />}
      <div className={showNavbar ? "p-4" : ""}>
        <Routes>
          <Route path="/" element={<Home />} /> 
          <Route path="/dashboard" element={<PrivateRoute><Dashboard/></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/admin/audit-log" element={<PrivateRoute><AuditLog /></PrivateRoute>} />
        </Routes>
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;