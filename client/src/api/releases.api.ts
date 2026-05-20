import api from './client';

export const releasesApi = {
  // Core CRUD
  list: (params?: any) => api.get('/releases', { params }).then(r => r.data),
  get: (id: string) => api.get(`/releases/${id}`).then(r => r.data),
  create: (data: any) => api.post('/releases', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/releases/${id}`, data).then(r => r.data),

  // Changes
  listChanges: (id: string) => api.get(`/releases/${id}/changes`).then(r => r.data),
  addChange: (id: string, changeId: string, sequenceOrder?: number) => api.post(`/releases/${id}/changes`, { change_id: changeId, sequence_order: sequenceOrder }).then(r => r.data),
  removeChange: (id: string, changeId: string) => api.delete(`/releases/${id}/changes/${changeId}`).then(r => r.data),

  // CIs
  addCi: (id: string, ciId: string) => api.post(`/releases/${id}/cis`, { ci_id: ciId }).then(r => r.data),
  removeCi: (id: string, ciId: string) => api.delete(`/releases/${id}/cis/${ciId}`).then(r => r.data),

  // Stakeholders
  addStakeholder: (id: string, userId: string, role?: string) => api.post(`/releases/${id}/stakeholders`, { user_id: userId, role }).then(r => r.data),
  removeStakeholder: (id: string, userId: string) => api.delete(`/releases/${id}/stakeholders/${userId}`).then(r => r.data),

  // Deployment Actions
  startDeployment: (id: string) => api.post(`/releases/${id}/start-deployment`).then(r => r.data),
  completeDeployment: (id: string, notes?: string) => api.post(`/releases/${id}/complete-deployment`, { notes }).then(r => r.data),
  rollback: (id: string, reason?: string) => api.post(`/releases/${id}/rollback`, { reason }).then(r => r.data),

  // Calendar & Metrics
  getCalendar: (startDate: string, endDate: string) => api.get('/releases/calendar', { params: { start_date: startDate, end_date: endDate } }).then(r => r.data),
  getMetrics: (startDate?: string, endDate?: string) => api.get('/releases/metrics', { params: { start_date: startDate, end_date: endDate } }).then(r => r.data),
};
