import api from './client';
import type { PaginatedResponse, QueryParams } from '@shared/interfaces';

export const assetsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/assets', { params }).then(r => r.data),
  get: (id: string) => api.get(`/assets/${id}`).then(r => r.data),
  create: (data: any) => api.post('/assets', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/assets/${id}`, data).then(r => r.data),
  getLifecycle: (id: string) => api.get(`/assets/${id}/lifecycle`).then(r => r.data),
  addLifecycleEvent: (id: string, data: any) => api.post(`/assets/${id}/lifecycle`, data).then(r => r.data),
  getInstallations: (id: string) => api.get(`/assets/${id}/installations`).then(r => r.data),
  addInstallation: (id: string, data: any) => api.post(`/assets/${id}/installations`, data).then(r => r.data),
  removeInstallation: (id: string, installationId: string) => api.delete(`/assets/${id}/installations/${installationId}`).then(r => r.data),
  listModels: () => api.get('/assets/models').then(r => r.data),
};

export const licensesApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/assets/licenses', { params }).then(r => r.data),
  get: (id: string) => api.get(`/assets/licenses/${id}`).then(r => r.data),
  create: (data: any) => api.post('/assets/licenses', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/assets/licenses/${id}`, data).then(r => r.data),
};
