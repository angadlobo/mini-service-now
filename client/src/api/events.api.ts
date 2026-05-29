import api from './client';
import type { PaginatedResponse, QueryParams } from '@shared/interfaces';

export const eventsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/events', { params }).then(r => r.data),
  get: (id: string) => api.get(`/events/${id}`).then(r => r.data),
  create: (data: any) => api.post('/events', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/events/${id}`, data).then(r => r.data),
  acknowledge: (id: string) => api.put(`/events/${id}/acknowledge`).then(r => r.data),
  resolve: (id: string) => api.put(`/events/${id}/resolve`).then(r => r.data),
  getCorrelations: (id: string) => api.get(`/events/${id}/correlations`).then(r => r.data),
  addCorrelation: (id: string, data: any) => api.post(`/events/${id}/correlations`, data).then(r => r.data),
};

export const alertRulesApi = {
  list: () => api.get('/events/alert-rules').then(r => r.data),
  get: (id: string) => api.get(`/events/alert-rules/${id}`).then(r => r.data),
  create: (data: any) => api.post('/events/alert-rules', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/events/alert-rules/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/events/alert-rules/${id}`).then(r => r.data),
};
