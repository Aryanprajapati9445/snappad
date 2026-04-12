import api from './api';
import { ApiResponse, User, LoginFormData, RegisterFormData } from '../types';

interface AuthData {
  user: User;
  accessToken: string;
}

export const authService = {
  register: async (data: Omit<RegisterFormData, 'confirmPassword'>): Promise<AuthData> => {
    const res = await api.post<ApiResponse<AuthData>>('/auth/register', data);
    return res.data.data!;
  },

  login: async (data: LoginFormData): Promise<AuthData> => {
    const res = await api.post<ApiResponse<AuthData>>('/auth/login', data);
    return res.data.data!;
  },

  googleAuth: async (credential: string): Promise<AuthData> => {
    const res = await api.post<ApiResponse<AuthData>>('/auth/google', { credential });
    return res.data.data!;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return res.data.data!.user;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, newPassword });
  },
};
