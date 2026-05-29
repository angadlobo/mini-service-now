import api from './client';

export interface SlaSummary {
  total: number;
  active: number;
  met: number;
  breached: number;
  complianceRate: number;
}

export interface SlaDefinitionStat {
  name: string;
  total: number;
  met: number;
  breached: number;
  rate: number;
}

export interface SlaDashboard {
  summary: SlaSummary;
  byDefinition: SlaDefinitionStat[];
}

export const slaApi = {
  getDashboard: (tableName?: string) =>
    api.get<SlaDashboard>('/sla/dashboard', { params: tableName ? { table_name: tableName } : {} }).then(r => r.data),
  getAtRisk: () => api.get<any[]>('/sla/at-risk').then(r => r.data),
  getBreached: () => api.get<any[]>('/sla/breached').then(r => r.data),
  listDefinitions: (tableName?: string) =>
    api.get<any[]>('/sla/definitions', { params: tableName ? { table_name: tableName } : {} }).then(r => r.data),
  getDefinition: (id: string) => api.get(`/sla/definitions/${id}`).then(r => r.data),
  createDefinition: (data: any) => api.post('/sla/definitions', data).then(r => r.data),
  updateDefinition: (id: string, data: any) => api.put(`/sla/definitions/${id}`, data).then(r => r.data),
  deleteDefinition: (id: string) => api.delete(`/sla/definitions/${id}`).then(r => r.data),
};
