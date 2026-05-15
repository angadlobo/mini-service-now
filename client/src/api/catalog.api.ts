import api from './client';
import type { ScCategory, ScCatalogItem, ScRequest, PaginatedResponse, QueryParams } from '@shared/interfaces';

export const catalogApi = {
  listCategories: () => api.get<ScCategory[]>('/catalog/categories').then(r => r.data),
  listItems: (categoryId?: string) => api.get<ScCatalogItem[]>('/catalog/items', { params: { category_id: categoryId } }).then(r => r.data),
  getItem: (id: string) => api.get<ScCatalogItem>(`/catalog/items/${id}`).then(r => r.data),
  createRequest: (data: { catalog_item_id: string; variables?: Record<string, unknown> }) =>
    api.post<ScRequest>('/catalog/requests', data).then(r => r.data),
  listRequests: (params?: QueryParams & { my?: string }) =>
    api.get<PaginatedResponse<ScRequest>>('/catalog/requests', { params }).then(r => r.data),
  getRequest: (id: string) => api.get<ScRequest>(`/catalog/requests/${id}`).then(r => r.data),
};
