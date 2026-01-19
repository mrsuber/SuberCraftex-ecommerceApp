import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/config/api';
import { tokenStorage } from '@/utils/storage';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear tokens on 401
      await tokenStorage.clearAll();
      // You can emit an event here to trigger logout in the app
    }
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;

// Helper function for multipart/form-data uploads
export const uploadFile = async (
  endpoint: string,
  formData: FormData
): Promise<{ url: string }> => {
  const token = await tokenStorage.getToken();

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Don't set Content-Type - let fetch set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed with status:', response.status, errorText);
      let errorMessage = 'Upload failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error: any) {
    console.error('Upload error:', error.message || error);
    throw error;
  }
};
