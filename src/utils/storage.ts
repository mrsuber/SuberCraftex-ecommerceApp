import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth-token';
const REFRESH_TOKEN_KEY = 'refresh-token';
const USER_KEY = 'user-data';

export const tokenStorage = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },

  async getUserData(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(USER_KEY);
    } catch {
      return null;
    }
  },

  async setUserData(data: string): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, data);
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  },
};

// Zustand persist storage adapter for SecureStore
export const secureStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};
