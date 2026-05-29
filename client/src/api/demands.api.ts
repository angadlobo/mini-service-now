import api from './client';
import type { PaginatedResponse, QueryParams } from '@shared/interfaces';

export const demandsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/demands', { params }).then(r => r.data),
  get: (id: string) => api.get(`/demands/${id}`).then(r => r.data),
  create: (data: any) => api.post('/demands', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/demands/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/demands/${id}`).then(r => r.data),
  getScores: (id: string) => api.get(`/demands/${id}/scores`).then(r => r.data),
  setScore: (id: string, data: any) => api.post(`/demands/${id}/scores`, data).then(r => r.data),
  getPipeline: () => api.get('/demands/pipeline').then(r => r.data),
};
