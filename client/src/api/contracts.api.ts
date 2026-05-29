import api from './client';
import type { PaginatedResponse, QueryParams } from '@shared/interfaces';

export const vendorsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/contracts/vendors', { params }).then(r => r.data),
  get: (id: string) => api.get<any>(`/contracts/vendors/${id}`).then(r => r.data),
  create: (data: any) => api.post<any>('/contracts/vendors', data).then(r => r.data),
  update: (id: string, data: any) => api.put<any>(`/contracts/vendors/${id}`, data).then(r => r.data),
  getAssessments: (id: string) => api.get<any[]>(`/contracts/vendors/${id}/assessments`).then(r => r.data),
  addAssessment: (id: string, data: any) => api.post<any>(`/contracts/vendors/${id}/assessments`, data).then(r => r.data),
};

export const contractsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/contracts/contracts', { params }).then(r => r.data),
  get: (id: string) => api.get<any>(`/contracts/contracts/${id}`).then(r => r.data),
  create: (data: any) => api.post<any>('/contracts/contracts', data).then(r => r.data),
  update: (id: string, data: any) => api.put<any>(`/contracts/contracts/${id}`, data).then(r => r.data),
  getLineItems: (id: string) => api.get<any[]>(`/contracts/contracts/${id}/line-items`).then(r => r.data),
  addLineItem: (id: string, data: any) => api.post<any>(`/contracts/contracts/${id}/line-items`, data).then(r => r.data),
  removeLineItem: (id: string, lineItemId: string) => api.delete(`/contracts/contracts/${id}/line-items/${lineItemId}`).then(r => r.data),
};
