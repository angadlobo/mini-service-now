import api from './client';
import type { PaginatedResponse, QueryParams } from '@shared/interfaces';

export const businessServicesApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/service-mapping', { params }).then(r => r.data),
  get: (id: string) => api.get(`/service-mapping/${id}`).then(r => r.data),
  create: (data: any) => api.post('/service-mapping', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/service-mapping/${id}`, data).then(r => r.data),
  getOfferings: (id: string) => api.get(`/service-mapping/${id}/offerings`).then(r => r.data),
  addOffering: (id: string, data: any) => api.post(`/service-mapping/${id}/offerings`, data).then(r => r.data),
  updateOffering: (offeringId: string, data: any) => api.put(`/service-mapping/offerings/${offeringId}`, data).then(r => r.data),
  deleteOffering: (offeringId: string) => api.delete(`/service-mapping/offerings/${offeringId}`).then(r => r.data),
  getDependencies: (id: string) => api.get(`/service-mapping/${id}/dependencies`).then(r => r.data),
  addDependency: (id: string, data: any) => api.post(`/service-mapping/${id}/dependencies`, data).then(r => r.data),
  removeDependency: (depId: string) => api.delete(`/service-mapping/dependencies/${depId}`).then(r => r.data),
  getCiMappings: (id: string) => api.get(`/service-mapping/${id}/ci-mappings`).then(r => r.data),
  addCiMapping: (id: string, data: any) => api.post(`/service-mapping/${id}/ci-mappings`, data).then(r => r.data),
  removeCiMapping: (mapId: string) => api.delete(`/service-mapping/ci-mappings/${mapId}`).then(r => r.data),
  getServiceMap: () => api.get('/service-mapping/map').then(r => r.data),
};
