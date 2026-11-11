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
};
