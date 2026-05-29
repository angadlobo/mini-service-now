import api from './client';

export interface MajorIncident {
  id: string;
  number: string;
  incident_id: string | null;
  incident_number?: string | null;
  title: string;
  status: 'proposed' | 'active' | 'resolved' | 'cancelled';
  severity: 'sev1' | 'sev2' | 'sev3';
  manager_id: string | null;
  manager_name?: string | null;
  business_impact: string | null;
  summary: string | null;
  war_room_url: string | null;
  declared_by_name?: string | null;
  declared_at: string;
  resolved_at: string | null;
  updates?: MajorIncidentUpdate[];
}

export interface MajorIncidentUpdate {
  id: string;
  type: 'timeline' | 'comms' | 'status';
  audience: 'internal' | 'stakeholders';
  message: string;
  posted_by_name?: string | null;
  created_at: string;
}

export const majorIncidentsApi = {
  list: (status?: string) => api.get<MajorIncident[]>('/major-incidents', { params: status ? { status } : {} }).then(r => r.data),
  getDashboard: () => api.get('/major-incidents/dashboard').then(r => r.data),
  get: (id: string) => api.get<MajorIncident>(`/major-incidents/${id}`).then(r => r.data),
  declare: (data: any) => api.post<MajorIncident>('/major-incidents', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/major-incidents/${id}`, data).then(r => r.data),
  postUpdate: (id: string, data: any) => api.post(`/major-incidents/${id}/updates`, data).then(r => r.data),
};
