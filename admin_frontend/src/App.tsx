import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import UserManagement from "./pages/UserManagement";
import AuditLog from "./pages/AuditLog";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./utils/PrivateRoute";

const AppContent: React.FC = () => {
  const location = useLocation();
  const showNavbar = location.pathname !== "/";

  return (
    <>
      {showNavbar && <Navbar />}
      <div className={showNavbar ? "p-4" : ""}>
        <Routes>
          <Route path="/" element={<Home />} /> 
          <Route path="/dashboard" element={<PrivateRoute><Dashboard/></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
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