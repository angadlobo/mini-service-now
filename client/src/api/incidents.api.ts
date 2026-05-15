import api from './client';
import type { Incident, PaginatedResponse, QueryParams } from '@shared/interfaces';

export const incidentsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<Incident>>('/incidents', { params }).then(r => r.data),
  get: (id: string) => api.get<Incident>(`/incidents/${id}`).then(r => r.data),
  create: (data: Partial<Incident>) => api.post<Incident>('/incidents', data).then(r => r.data),
  update: (id: string, data: Partial<Incident>) => api.put<Incident>(`/incidents/${id}`, data).then(r => r.data),
};
