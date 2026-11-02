import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';

import { StudentDashboard } from './pages/student/StudentDashboard.tsx';
import { StudentClearance } from './pages/student/StudentClearance.tsx';
import { StudentProfile } from './pages/student/StudentProfile.tsx';

import { OfficerDashboard } from './pages/officer/OfficerDashboard.tsx';
import { OfficerScanner } from './pages/officer/OfficerScanner.tsx';
import { OfficerProfile } from './pages/officer/OfficerProfile.tsx';

import { AdminDashboard } from './pages/admin/AdminDashboard.tsx';
import { AdminEvents } from './pages/admin/AdminEvents.tsx';
import { AdminStudents } from './pages/admin/AdminStudents.tsx';
import { AdminOfficers } from './pages/admin/AdminOfficers.tsx';
import { AdminManagement } from './pages/admin/AdminManagement.tsx';
import { AdminSettings } from './pages/admin/AdminSettings.tsx';
import { AdminProfile } from './pages/admin/AdminProfile.tsx';
import { AdminAnnouncements } from './pages/admin/AdminAnnouncements.tsx';

import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { isAuthenticated, getUserRole } from './utils/auth.ts';

function HomeRedirect() {
  if (isAuthenticated()) {
    const role = getUserRole();
    switch (role) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      case 'officer':
        return <Navigate to="/officer/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <LoginPage />;
    }
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="App min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
        <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Student Dashboards & Features (Student only) */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/clearance"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentClearance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />

          {/* Officer Dashboards & Features (Officer or Admin) */}
          <Route
            path="/officer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <OfficerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/scanner"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <OfficerScanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/profile"
            element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <OfficerProfile />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboards & Features (Admin only) */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/officers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminOfficers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/admins"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnnouncements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminProfile />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Global Toast System */}
      <Toaster position="top-right" richColors closeButton />
    </div>
    </ErrorBoundary>
  );
}
