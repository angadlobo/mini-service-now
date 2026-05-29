import api from './client';
import type { PaginatedResponse, QueryParams } from '@shared/interfaces';

export const resourcePoolsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/capacity/pools', { params }).then(r => r.data),
  get: (id: string) => api.get(`/capacity/pools/${id}`).then(r => r.data),
  create: (data: any) => api.post('/capacity/pools', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/capacity/pools/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/capacity/pools/${id}`).then(r => r.data),
  getAllocations: (id: string) => api.get(`/capacity/pools/${id}/allocations`).then(r => r.data),
  addAllocation: (id: string, data: any) => api.post(`/capacity/pools/${id}/allocations`, data).then(r => r.data),
  updateAllocation: (allocId: string, data: any) => api.put(`/capacity/allocations/${allocId}`, data).then(r => r.data),
  deleteAllocation: (allocId: string) => api.delete(`/capacity/allocations/${allocId}`).then(r => r.data),
  getForecasts: (id: string) => api.get(`/capacity/pools/${id}/forecasts`).then(r => r.data),
  addForecast: (id: string, data: any) => api.post(`/capacity/pools/${id}/forecasts`, data).then(r => r.data),
  updateForecast: (forecastId: string, data: any) => api.put(`/capacity/forecasts/${forecastId}`, data).then(r => r.data),
  getDashboard: () => api.get('/capacity/dashboard').then(r => r.data),
};
