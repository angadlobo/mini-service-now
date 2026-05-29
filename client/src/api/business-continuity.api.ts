import api from './client';
import type { PaginatedResponse, QueryParams } from '@shared/interfaces';

export const bcPlansApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/business-continuity', { params }).then(r => r.data),
  get: (id: string) => api.get(`/business-continuity/${id}`).then(r => r.data),
  create: (data: any) => api.post('/business-continuity', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/business-continuity/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/business-continuity/${id}`).then(r => r.data),
  getTasks: (id: string) => api.get(`/business-continuity/${id}/tasks`).then(r => r.data),
  addTask: (id: string, data: any) => api.post(`/business-continuity/${id}/tasks`, data).then(r => r.data),
  updateTask: (taskId: string, data: any) => api.put(`/business-continuity/tasks/${taskId}`, data).then(r => r.data),
  deleteTask: (taskId: string) => api.delete(`/business-continuity/tasks/${taskId}`).then(r => r.data),
  getTests: (id: string) => api.get(`/business-continuity/${id}/tests`).then(r => r.data),
  addTest: (id: string, data: any) => api.post(`/business-continuity/${id}/tests`, data).then(r => r.data),
  updateTest: (testId: string, data: any) => api.put(`/business-continuity/tests/${testId}`, data).then(r => r.data),
};
