import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUser } from '../utils/auth.ts';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'student' | 'officer' | 'admin'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const user = getUser();
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect unauthorized role to their own designated dashboard
    switch (user.role) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      case 'officer':
        return <Navigate to="/officer/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
