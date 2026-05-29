import api from './client';

export const emailProcessingApi = {
  listAccounts: () => api.get<any[]>('/email/accounts').then(r => r.data),
  createAccount: (data: any) => api.post('/email/accounts', data).then(r => r.data),
  updateAccount: (id: string, data: any) => api.put(`/email/accounts/${id}`, data).then(r => r.data),
  deleteAccount: (id: string) => api.delete(`/email/accounts/${id}`).then(r => r.data),
  listRules: (accountId?: string) => api.get<any[]>('/email/rules', { params: accountId ? { account_id: accountId } : {} }).then(r => r.data),
  createRule: (data: any) => api.post('/email/rules', data).then(r => r.data),
  deleteRule: (id: string) => api.delete(`/email/rules/${id}`).then(r => r.data),
  getProcessed: () => api.get<any[]>('/email/processed').then(r => r.data),
};
