import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import { authService } from './services/auth.service';
import { useAuthStore } from './store/authStore';

const LandingPage         = React.lazy(() => import('./pages/LandingPage'));
const LoginPage           = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage        = React.lazy(() => import('./pages/RegisterPage'));
const DashboardPage       = React.lazy(() => import('./pages/DashboardPage'));
const ProfilePage         = React.lazy(() => import('./pages/ProfilePage'));
const ForgotPasswordPage  = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage   = React.lazy(() => import('./pages/ResetPasswordPage'));
const GoogleCallbackPage  = React.lazy(() => import('./pages/GoogleCallbackPage'));

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg className="animate-spin w-8 h-8 text-primary-400" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await authService.getMe();
        setUser(user);
      } catch (err: any) {
        // Only clear auth on explicit 401 (token invalid/expired).
        // On network errors (backend still starting), keep existing state.
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          setUser(null);
        }
      } finally {
        // Always clear loading — prevents infinite spinner on network timeout
        setLoading(false);
      }
    };
    initAuth();
  }, [setUser, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(30, 41, 59, 0.95)',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(16px)',
            fontSize: '13px',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          },
          success: { iconTheme: { primary: '#3b82f6', secondary: '#f1f5f9' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#f1f5f9' } },
        }}
      />
    </QueryClientProvider>
  );
}
