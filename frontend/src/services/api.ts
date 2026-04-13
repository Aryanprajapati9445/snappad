import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (r: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (error.response?.data?.code === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => api(original));
        }

        original._retry = true;
        isRefreshing = true;

        try {
          await api.post('/auth/refresh');
          processQueue(null);
          return api(original);
        } catch (refreshError) {
          processQueue(refreshError, null);
          // Redirect to login
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Non-expired 401 on a protected route — only redirect if not an auth init call
      const isAuthCheck = original.url?.includes('/auth/me') || original.url?.includes('/auth/refresh');
      if (!isAuthCheck) {
        const publicPaths = ['/', '/login', '/register'];
        const isPublic = publicPaths.some((p) => window.location.pathname === p || window.location.pathname.startsWith(p + '/'));
        if (!isPublic) {
          window.location.href = '/login';
        }
      }

    }

    // Show toast for server errors (except auth errors handled above)
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }

    return Promise.reject(error);
  }
);

export default api;
