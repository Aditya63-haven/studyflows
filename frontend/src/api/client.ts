import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'studyflows.token';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler;
};

const isAuthFreePath = (url: string): boolean =>
  url.startsWith('/auth/login') || url.startsWith('/auth/register') || url.startsWith('/public/');

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !isAuthFreePath(error.config?.url ?? '')
    ) {
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

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

export const resolveApiAssetUrl = (assetUrl: string | null | undefined): string | null => {
  if (!assetUrl) {
    return null;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(assetUrl)) {
    return assetUrl;
  }
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return new URL(assetUrl, API_BASE_URL).toString();
  }
  return assetUrl;
};

export default apiClient;
