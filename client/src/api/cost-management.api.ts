import api from './client';
import type { PaginatedResponse, QueryParams } from '@shared/interfaces';

export const costCentersApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/cost-management/cost-centers', { params }).then(r => r.data),
  get: (id: string) => api.get(`/cost-management/cost-centers/${id}`).then(r => r.data),
  create: (data: any) => api.post('/cost-management/cost-centers', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/cost-management/cost-centers/${id}`, data).then(r => r.data),
};

export const costItemsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/cost-management/cost-items', { params }).then(r => r.data),
  get: (id: string) => api.get(`/cost-management/cost-items/${id}`).then(r => r.data),
  create: (data: any) => api.post('/cost-management/cost-items', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/cost-management/cost-items/${id}`, data).then(r => r.data),
};

export const chargebackApi = {
  listRules: () => api.get('/cost-management/chargeback-rules').then(r => r.data),
  createRule: (data: any) => api.post('/cost-management/chargeback-rules', data).then(r => r.data),
  updateRule: (id: string, data: any) => api.put(`/cost-management/chargeback-rules/${id}`, data).then(r => r.data),
  deleteRule: (id: string) => api.delete(`/cost-management/chargeback-rules/${id}`).then(r => r.data),
  listRecords: (params?: QueryParams) => api.get('/cost-management/chargeback-records', { params }).then(r => r.data),
  generate: (period: string) => api.post('/cost-management/chargeback-records/generate', { period }).then(r => r.data),
  getSummary: () => api.get('/cost-management/summary').then(r => r.data),
};
