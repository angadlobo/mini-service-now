import api from './client';
import type { Change, PaginatedResponse, QueryParams } from '@shared/interfaces';

export const changesApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<Change>>('/changes', { params }).then(r => r.data),
  get: (id: string) => api.get<Change>(`/changes/${id}`).then(r => r.data),
  create: (data: Partial<Change>) => api.post<Change>('/changes', data).then(r => r.data),
  update: (id: string, data: Partial<Change>) => api.put<Change>(`/changes/${id}`, data).then(r => r.data),
};
