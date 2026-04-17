import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AmbientBackground from './components/AmbientBackground';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminPage from './pages/AdminPage';
import CashPayoutPage from './pages/CashPayoutPage';
import EasyKavachDashboard from './pages/EasyKavachDashboard';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';


function RequireRole({ role, children }) {
  const { session, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && session?.type !== role) {
    return <Navigate to={session?.type === 'admin' ? '/admin' : '/profile'} replace />;
  }

  return children;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <div className="ek-app">
      <AmbientBackground />
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        <Route path="/" element={<EasyKavachDashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/profile"
          element={
            <RequireRole role="worker">
              <ProfilePage />
            </RequireRole>
          }
        />
        <Route
          path="/cash-payout"
          element={
            <RequireRole role="worker">
              <CashPayoutPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <AdminPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
