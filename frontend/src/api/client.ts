import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'studyflows.token';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiErrorPayload {
  error?: {
    name?: string;
    message?: string;
    details?: unknown;
  };
}

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    if (payload?.error?.message) {
      return payload.error.message;
    }
    if (error.response?.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    return error.message || 'The request failed.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
};

export default apiClient;
