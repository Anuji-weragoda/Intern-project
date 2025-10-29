import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import UserManagement from '../pages/UserManagement';
import AuditLog from '../pages/AuditLog';
import { useAuth } from '../hooks/useAuth';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return null;
  }

  return (
    <Routes>
      {/* Public Routes - Only show home if not authenticated */}
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/profile" replace /> : <Home />} 
      />

      {/* Protected Routes */}
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute>
            <UserManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/audit-log"
        element={
          <PrivateRoute>
            <AuditLog />
          </PrivateRoute>
        }
      />

      {/* Catch all - redirect based on auth state */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? "/profile" : "/"} replace />} 
      />
    </Routes>
  );
};