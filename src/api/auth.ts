import apiClient from './client';
import { API_ENDPOINTS } from '@/config/api';
import type { User } from '@/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token?: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.login, data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.register, data);
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.logout);
    return response.data;
  },

  me: async (): Promise<{ user: User }> => {
    const response = await apiClient.get(API_ENDPOINTS.auth.me);
    return response.data;
  },

  verifyEmail: async (email: string, code: string): Promise<{ message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.verifyEmail, { email, code });
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.resendVerification, { email });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.auth.forgotPassword, { email });
    return response.data;
  },
};
