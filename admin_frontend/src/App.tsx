import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import UserManagement from "./pages/UserManagement";
import AuditLog from "./pages/AuditLog";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import PrivateRoute from "./utils/PrivateRoute";

const App: React.FC = () => {
  return (
    <Router>
      <Navbar />
      <div className="p-4">
        <Routes>
        <Route path="/" element={<Home />} /> 
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/admin/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
        <Route path="/admin/audit-log" element={<PrivateRoute><AuditLog /></PrivateRoute>} />
    </Routes>

      </div>
    </Router>
  );
};

export default App;
