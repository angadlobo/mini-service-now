import api from './client';
import type { KbArticle, KbCategory, PaginatedResponse, QueryParams } from '@shared/interfaces';

export const knowledgeApi = {
  listCategories: () => api.get<KbCategory[]>('/knowledge/categories').then(r => r.data),
  list: (params?: QueryParams & { q?: string }) => api.get<PaginatedResponse<KbArticle>>('/knowledge', { params }).then(r => r.data),
  get: (id: string) => api.get<KbArticle>(`/knowledge/${id}`).then(r => r.data),
  create: (data: Partial<KbArticle>) => api.post<KbArticle>('/knowledge', data).then(r => r.data),
  update: (id: string, data: Partial<KbArticle>) => api.put<KbArticle>(`/knowledge/${id}`, data).then(r => r.data),
  markHelpful: (id: string) => api.post(`/knowledge/${id}/helpful`).then(r => r.data),
};
