import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl mx-auto mb-4 animate-pulse"
               style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }} />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to landing page (not /login) so the browser doesn't get
    // stuck at /login every time the dev server restarts.
    // The user can click "Sign In" from the landing page.
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
