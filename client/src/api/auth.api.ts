import api from './client';
import type { LoginRequest, AuthResponse, UserProfile } from '@shared/interfaces';

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data).then(r => r.data),
  register: (data: { username: string; email: string; password: string; first_name: string; last_name: string }) =>
    api.post('/auth/register', data).then(r => r.data),
  refresh: () => api.post<AuthResponse>('/auth/refresh').then(r => r.data),
  me: () => api.get<{ user: UserProfile }>('/auth/me').then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
};
