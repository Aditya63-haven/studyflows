import apiClient from './client';
import { AuthResponse, User } from './types';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name: string;
}

export type UploadProgressHandler = (percent: number) => void;

export const authApi = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', input);
    return data;
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', input);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<{ user: User }>('/auth/me');
    return data.user;
  },

  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const { data } = await apiClient.patch<{ user: User }>('/auth/me', input);
    return data.user;
  },

  async uploadAvatar(file: File, onProgress?: UploadProgressHandler): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);

    const { data } = await apiClient.post<{ user: User }>('/auth/me/avatar', formData, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
    return data.user;
  },

  async removeAvatar(): Promise<User> {
    const { data } = await apiClient.delete<{ user: User }>('/auth/me/avatar');
    return data.user;
  },
};
