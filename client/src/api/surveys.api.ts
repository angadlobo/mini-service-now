import api from './client';
import type { PaginatedResponse, QueryParams } from '@shared/interfaces';

export const surveysApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/surveys', { params }).then(r => r.data),
  get: (id: string) => api.get(`/surveys/${id}`).then(r => r.data),
  create: (data: any) => api.post('/surveys', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/surveys/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/surveys/${id}`).then(r => r.data),
  getQuestions: (id: string) => api.get(`/surveys/${id}/questions`).then(r => r.data),
  addQuestion: (id: string, data: any) => api.post(`/surveys/${id}/questions`, data).then(r => r.data),
  updateQuestion: (questionId: string, data: any) => api.put(`/surveys/questions/${questionId}`, data).then(r => r.data),
  deleteQuestion: (questionId: string) => api.delete(`/surveys/questions/${questionId}`).then(r => r.data),
  reorderQuestions: (id: string, questionIds: string[]) => api.put(`/surveys/${id}/questions/reorder`, { questionIds }).then(r => r.data),
  submitResponse: (id: string, data: any) => api.post(`/surveys/${id}/respond`, data).then(r => r.data),
  getResponses: (id: string, params?: QueryParams) => api.get(`/surveys/${id}/responses`, { params }).then(r => r.data),
  getResponseDetail: (responseId: string) => api.get(`/surveys/responses/${responseId}`).then(r => r.data),
  getAnalytics: (id: string) => api.get(`/surveys/${id}/analytics`).then(r => r.data),
};
