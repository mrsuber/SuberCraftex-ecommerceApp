import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { secureStorageAdapter, tokenStorage } from '@/utils/storage';
import { authApi } from '@/api/auth';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth operations
  login: (email: string, password: string) => Promise<boolean>;
  register: (fullName: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setToken: async (token) => {
        if (token) {
          await tokenStorage.setToken(token);
        } else {
          await tokenStorage.removeToken();
        }
        set({ token });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          const { user, token } = response;

          if (token) {
            await tokenStorage.setToken(token);
          }

          set({
            user,
            token: token || null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error: any) {
          const message =
            error.response?.data?.error ||
            error.message ||
            'Login failed. Please try again.';
          set({
            error: message,
            isLoading: false,
            isAuthenticated: false,
          });
          return false;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.register({ name, email, password });
          set({ isLoading: false, error: null });
          return true;
        } catch (error: any) {
          const message =
            error.response?.data?.error ||
            error.message ||
            'Registration failed. Please try again.';
          set({
            error: message,
            isLoading: false,
          });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch {
          // Ignore errors on logout
        } finally {
          await tokenStorage.clearAll();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const token = await tokenStorage.getToken();
          if (!token) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return false;
          }

          const { user } = await authApi.me();
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch {
          await tokenStorage.clearAll();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorageAdapter),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
