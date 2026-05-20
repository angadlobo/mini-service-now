import api from './client';

export const changesApi = {
  // Core CRUD
  list: (params?: any) => api.get('/changes', { params }).then(r => r.data),
  get: (id: string) => api.get(`/changes/${id}`).then(r => r.data),
  create: (data: any) => api.post('/changes', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/changes/${id}`, data).then(r => r.data),

  // Risk & Impact
  assessRisk: (id: string) => api.get(`/changes/${id}/risk-assessment`).then(r => r.data),
  aiRiskAnalysis: (id: string) => api.post(`/changes/${id}/ai-risk-analysis`).then(r => r.data),

  // Conflicts
  resolveConflict: (conflictId: string, resolution: string) => api.put(`/changes/conflicts/${conflictId}/resolve`, { resolution }).then(r => r.data),

  // Calendar & Scheduling
  getCalendar: (startDate: string, endDate: string) => api.get('/changes/calendar', { params: { start_date: startDate, end_date: endDate } }).then(r => r.data),

  // Metrics
  getMetrics: (startDate?: string, endDate?: string) => api.get('/changes/metrics', { params: { start_date: startDate, end_date: endDate } }).then(r => r.data),

  // Linking
  linkIncident: (changeId: string, incidentId: string, relationship?: string) => api.post(`/changes/${changeId}/incidents`, { incident_id: incidentId, relationship }).then(r => r.data),
  unlinkIncident: (changeId: string, incidentId: string) => api.delete(`/changes/${changeId}/incidents/${incidentId}`).then(r => r.data),
  linkProblem: (changeId: string, problemId: string, relationship?: string) => api.post(`/changes/${changeId}/problems`, { problem_id: problemId, relationship }).then(r => r.data),
  unlinkProblem: (changeId: string, problemId: string) => api.delete(`/changes/${changeId}/problems/${problemId}`).then(r => r.data),

  // Templates
  listTemplates: (params?: any) => api.get('/changes/templates/list', { params }).then(r => r.data),
  getTemplate: (id: string) => api.get(`/changes/templates/${id}`).then(r => r.data),
  createTemplate: (data: any) => api.post('/changes/templates', data).then(r => r.data),
  updateTemplate: (id: string, data: any) => api.put(`/changes/templates/${id}`, data).then(r => r.data),
  deleteTemplate: (id: string) => api.delete(`/changes/templates/${id}`).then(r => r.data),
  createFromTemplate: (templateId: string, overrides: any) => api.post(`/changes/templates/${templateId}/create-change`, overrides).then(r => r.data),
  listStandardCatalog: () => api.get('/changes/standard-catalog').then(r => r.data),

  // Approval Rules
  listApprovalRules: () => api.get('/changes/approval-rules/list').then(r => r.data),
  createApprovalRule: (data: any) => api.post('/changes/approval-rules', data).then(r => r.data),
  updateApprovalRule: (id: string, data: any) => api.put(`/changes/approval-rules/${id}`, data).then(r => r.data),
  deleteApprovalRule: (id: string) => api.delete(`/changes/approval-rules/${id}`).then(r => r.data),

  // CAB Management
  listCabMeetings: (params?: any) => api.get('/changes/cab/meetings', { params }).then(r => r.data),
  getCabMeeting: (id: string) => api.get(`/changes/cab/meetings/${id}`).then(r => r.data),
  createCabMeeting: (data: any) => api.post('/changes/cab/meetings', data).then(r => r.data),
  updateCabMeeting: (id: string, data: any) => api.put(`/changes/cab/meetings/${id}`, data).then(r => r.data),
  addToAgenda: (meetingId: string, changeId: string) => api.post(`/changes/cab/meetings/${meetingId}/agenda`, { change_id: changeId }).then(r => r.data),
  removeFromAgenda: (meetingId: string, changeId: string) => api.delete(`/changes/cab/meetings/${meetingId}/agenda/${changeId}`).then(r => r.data),
  recordCabDecision: (itemId: string, data: any) => api.put(`/changes/cab/agenda/${itemId}/decision`, data).then(r => r.data),

  // Maintenance Windows
  listMaintenanceWindows: () => api.get('/changes/maintenance-windows/list').then(r => r.data),
  createMaintenanceWindow: (data: any) => api.post('/changes/maintenance-windows', data).then(r => r.data),
  updateMaintenanceWindow: (id: string, data: any) => api.put(`/changes/maintenance-windows/${id}`, data).then(r => r.data),
  deleteMaintenanceWindow: (id: string) => api.delete(`/changes/maintenance-windows/${id}`).then(r => r.data),

  // Blackout Windows
  listBlackoutWindows: () => api.get('/changes/blackout-windows/list').then(r => r.data),
  createBlackoutWindow: (data: any) => api.post('/changes/blackout-windows', data).then(r => r.data),
  updateBlackoutWindow: (id: string, data: any) => api.put(`/changes/blackout-windows/${id}`, data).then(r => r.data),
  deleteBlackoutWindow: (id: string) => api.delete(`/changes/blackout-windows/${id}`).then(r => r.data),
};
