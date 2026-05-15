import api from './client';
import type {
  JournalEntry, Attachment, AuditEntry, Approval, Notification, DashboardStats,
  User, PaginatedResponse, QueryParams, Problem, ConfigurationItem, CiType,
  CiRelationship, WorkflowRule, WorkflowExecution, Integration, IntegrationLog,
  Report, FormTemplate, FormSubmission, AiProvider, AiPrompt, SystemSetting,
} from '@shared/interfaces';

export const journalApi = {
  list: (tableName: string, recordId: string) =>
    api.get<JournalEntry[]>(`/journal/${tableName}/${recordId}`).then(r => r.data),
  create: (tableName: string, recordId: string, data: { type: string; body: string }) =>
    api.post<JournalEntry>(`/journal/${tableName}/${recordId}`, data).then(r => r.data),
};

export const attachmentApi = {
  list: (tableName: string, recordId: string) =>
    api.get<Attachment[]>(`/attachments/${tableName}/${recordId}`).then(r => r.data),
  upload: (tableName: string, recordId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Attachment>(`/attachments/${tableName}/${recordId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  download: (id: string) => api.get(`/attachments/download/${id}`, { responseType: 'blob' }),
  delete: (id: string) => api.delete(`/attachments/${id}`).then(r => r.data),
};

export const auditApi = {
  list: (tableName: string, recordId: string) =>
    api.get<AuditEntry[]>(`/audit/${tableName}/${recordId}`).then(r => r.data),
};

export const approvalApi = {
  listMine: (params?: QueryParams) =>
    api.get<PaginatedResponse<Approval>>('/approvals/mine', { params }).then(r => r.data),
  decide: (id: string, data: { state: 'approved' | 'rejected'; comments?: string }) =>
    api.put(`/approvals/${id}/decide`, data).then(r => r.data),
  getForRecord: (tableName: string, recordId: string) =>
    api.get<Approval[]>(`/approvals/${tableName}/${recordId}`).then(r => r.data),
};

export const notificationApi = {
  list: () => api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications').then(r => r.data),
  markRead: (id: string) => api.put(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => api.put('/notifications/read-all').then(r => r.data),
};

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats').then(r => r.data),
  getMyWork: () => api.get<{ incidents: any[]; changes: any[]; problems: any[] }>('/dashboard/my-work').then(r => r.data),
};

export const usersApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<User>>('/users', { params }).then(r => r.data),
  get: (id: string) => api.get<User & { roles: string[] }>(`/users/${id}`).then(r => r.data),
  update: (id: string, data: Partial<User>) => api.put(`/users/${id}`, data).then(r => r.data),
  updateRoles: (id: string, roles: string[]) => api.put(`/users/${id}/roles`, { roles }).then(r => r.data),
  listGroups: () => api.get('/users/groups').then(r => r.data),
};

// ── Problems ──────────────────────────────────────────
export const problemsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<Problem>>('/problems', { params }).then(r => r.data),
  get: (id: string) => api.get<Problem>(`/problems/${id}`).then(r => r.data),
  create: (data: Partial<Problem>) => api.post<Problem>('/problems', data).then(r => r.data),
  update: (id: string, data: Partial<Problem>) => api.put<Problem>(`/problems/${id}`, data).then(r => r.data),
  getLinkedIncidents: (id: string) => api.get(`/problems/${id}/incidents`).then(r => r.data),
  linkIncident: (id: string, incidentId: string) => api.post(`/problems/${id}/incidents/${incidentId}`).then(r => r.data),
  unlinkIncident: (id: string, incidentId: string) => api.delete(`/problems/${id}/incidents/${incidentId}`).then(r => r.data),
  getLinkedChanges: (id: string) => api.get(`/problems/${id}/changes`).then(r => r.data),
  linkChange: (id: string, changeId: string) => api.post(`/problems/${id}/changes/${changeId}`).then(r => r.data),
  unlinkChange: (id: string, changeId: string) => api.delete(`/problems/${id}/changes/${changeId}`).then(r => r.data),
};

// ── CMDB ──────────────────────────────────────────────
export const cmdbApi = {
  listTypes: () => api.get<CiType[]>('/cmdb/types').then(r => r.data),
  createType: (data: Partial<CiType>) => api.post<CiType>('/cmdb/types', data).then(r => r.data),
  updateType: (id: string, data: Partial<CiType>) => api.put<CiType>(`/cmdb/types/${id}`, data).then(r => r.data),
  listCis: (params?: QueryParams) => api.get<PaginatedResponse<ConfigurationItem>>('/cmdb/cis', { params }).then(r => r.data),
  getCi: (id: string) => api.get<ConfigurationItem>(`/cmdb/cis/${id}`).then(r => r.data),
  createCi: (data: Partial<ConfigurationItem>) => api.post<ConfigurationItem>('/cmdb/cis', data).then(r => r.data),
  updateCi: (id: string, data: Partial<ConfigurationItem>) => api.put<ConfigurationItem>(`/cmdb/cis/${id}`, data).then(r => r.data),
  getRelationships: (ciId: string) => api.get<{ outgoing: CiRelationship[]; incoming: CiRelationship[] }>(`/cmdb/cis/${ciId}/relationships`).then(r => r.data),
  addRelationship: (ciId: string, data: { child_ci_id: string; type: string }) => api.post(`/cmdb/cis/${ciId}/relationships`, data).then(r => r.data),
  removeRelationship: (ciId: string, relId: string) => api.delete(`/cmdb/cis/${ciId}/relationships/${relId}`).then(r => r.data),
  getImpact: (ciId: string) => api.get(`/cmdb/cis/${ciId}/impact`).then(r => r.data),
};

// ── Workflows ─────────────────────────────────────────
export const workflowsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<WorkflowRule>>('/workflows', { params }).then(r => r.data),
  get: (id: string) => api.get<WorkflowRule>(`/workflows/${id}`).then(r => r.data),
  create: (data: Partial<WorkflowRule>) => api.post<WorkflowRule>('/workflows', data).then(r => r.data),
  update: (id: string, data: Partial<WorkflowRule>) => api.put<WorkflowRule>(`/workflows/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/workflows/${id}`).then(r => r.data),
  getExecutions: (params?: QueryParams) => api.get<PaginatedResponse<WorkflowExecution>>('/workflows/executions', { params }).then(r => r.data),
};

// ── Integrations ──────────────────────────────────────
export const integrationsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<Integration>>('/integrations', { params }).then(r => r.data),
  get: (id: string) => api.get<Integration>(`/integrations/${id}`).then(r => r.data),
  create: (data: Partial<Integration>) => api.post<Integration>('/integrations', data).then(r => r.data),
  update: (id: string, data: Partial<Integration>) => api.put<Integration>(`/integrations/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/integrations/${id}`).then(r => r.data),
  test: (id: string) => api.post(`/integrations/${id}/test`).then(r => r.data),
  getLogs: (id: string, params?: QueryParams) => api.get<PaginatedResponse<IntegrationLog>>(`/integrations/${id}/logs`, { params }).then(r => r.data),
};

// ── Reports ───────────────────────────────────────────
export const reportsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<Report>>('/reports', { params }).then(r => r.data),
  get: (id: string) => api.get<Report>(`/reports/${id}`).then(r => r.data),
  create: (data: Partial<Report>) => api.post<Report>('/reports', data).then(r => r.data),
  update: (id: string, data: Partial<Report>) => api.put<Report>(`/reports/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/reports/${id}`).then(r => r.data),
  run: (id: string) => api.get(`/reports/${id}/run`).then(r => r.data),
  exportCsv: (id: string) => api.get(`/reports/${id}/export`, { responseType: 'blob' }),
};

// ── Forms ─────────────────────────────────────────────
export const formsApi = {
  list: (params?: QueryParams) => api.get<PaginatedResponse<FormTemplate>>('/forms', { params }).then(r => r.data),
  get: (id: string) => api.get<FormTemplate>(`/forms/${id}`).then(r => r.data),
  create: (data: any) => api.post<FormTemplate>('/forms', data).then(r => r.data),
  update: (id: string, data: any) => api.put<FormTemplate>(`/forms/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/forms/${id}`).then(r => r.data),
  submit: (id: string, data: any) => api.post<FormSubmission>(`/forms/${id}/submit`, data).then(r => r.data),
  getSubmissions: (id: string, params?: QueryParams) => api.get<PaginatedResponse<FormSubmission>>(`/forms/${id}/submissions`, { params }).then(r => r.data),
};

// ── AI ────────────────────────────────────────────────
export const aiApi = {
  listProviders: () => api.get<AiProvider[]>('/ai/providers').then(r => r.data),
  getProvider: (id: string) => api.get<AiProvider>(`/ai/providers/${id}`).then(r => r.data),
  createProvider: (data: any) => api.post<AiProvider>('/ai/providers', data).then(r => r.data),
  updateProvider: (id: string, data: any) => api.put<AiProvider>(`/ai/providers/${id}`, data).then(r => r.data),
  deleteProvider: (id: string) => api.delete(`/ai/providers/${id}`).then(r => r.data),
  testProvider: (id: string) => api.post<{ success: boolean; message: string }>(`/ai/providers/${id}/test`).then(r => r.data),

  listPrompts: () => api.get<AiPrompt[]>('/ai/prompts').then(r => r.data),
  getPromptsByUseCase: (useCase: string) => api.get<AiPrompt[]>(`/ai/prompts/use-case/${useCase}`).then(r => r.data),
  createPrompt: (data: any) => api.post<AiPrompt>('/ai/prompts', data).then(r => r.data),
  updatePrompt: (id: string, data: any) => api.put<AiPrompt>(`/ai/prompts/${id}`, data).then(r => r.data),
  deletePrompt: (id: string) => api.delete(`/ai/prompts/${id}`).then(r => r.data),

  generate: (promptId: string, context: Record<string, string>) =>
    api.post<{ text: string; logId: string; tokensUsed: number }>('/ai/generate', { promptId, context }).then(r => r.data),
  feedback: (logId: string, feedback: 'helpful' | 'not_helpful') =>
    api.post('/ai/feedback', { logId, feedback }).then(r => r.data),
  getUsage: () => api.get('/ai/usage').then(r => r.data),
};

// ── Settings ──────────────────────────────────────────
export const settingsApi = {
  getAll: () => api.get<SystemSetting[]>('/settings').then(r => r.data),
  getByCategory: (category: string) => api.get<SystemSetting[]>(`/settings/${category}`).then(r => r.data),
  update: (settings: { key: string; value: string }[]) => api.put('/settings', { settings }).then(r => r.data),
};

// ── Notification Preferences ──────────────────────────
export const notificationPrefsApi = {
  getChannels: () => api.get('/notification-prefs/channels').then(r => r.data),
  createChannel: (data: any) => api.post('/notification-prefs/channels', data).then(r => r.data),
  updateChannel: (id: string, data: any) => api.put(`/notification-prefs/channels/${id}`, data).then(r => r.data),
  deleteChannel: (id: string) => api.delete(`/notification-prefs/channels/${id}`).then(r => r.data),
  getPreferences: () => api.get('/notification-prefs/preferences').then(r => r.data),
  setPreference: (data: { channel_id: string; events: string[]; active: boolean }) =>
    api.put('/notification-prefs/preferences', data).then(r => r.data),
};
