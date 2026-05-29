import api from './client';

export const oncallApi = {
  listSchedules: () => api.get('/oncall/schedules').then(r => r.data),
  getSchedule: (id: string) => api.get(`/oncall/schedules/${id}`).then(r => r.data),
  createSchedule: (data: any) => api.post('/oncall/schedules', data).then(r => r.data),
  updateSchedule: (id: string, data: any) => api.put(`/oncall/schedules/${id}`, data).then(r => r.data),
  deleteSchedule: (id: string) => api.delete(`/oncall/schedules/${id}`).then(r => r.data),
  getRotations: (scheduleId: string) => api.get(`/oncall/schedules/${scheduleId}/rotations`).then(r => r.data),
  addRotation: (scheduleId: string, data: any) => api.post(`/oncall/schedules/${scheduleId}/rotations`, data).then(r => r.data),
  updateRotation: (id: string, data: any) => api.put(`/oncall/rotations/${id}`, data).then(r => r.data),
  deleteRotation: (id: string) => api.delete(`/oncall/rotations/${id}`).then(r => r.data),
  addOverride: (scheduleId: string, data: any) => api.post(`/oncall/schedules/${scheduleId}/overrides`, data).then(r => r.data),
  deleteOverride: (id: string) => api.delete(`/oncall/overrides/${id}`).then(r => r.data),
  getWhosOnCall: () => api.get('/oncall/whos-oncall').then(r => r.data),
};

export const escalationApi = {
  listPolicies: () => api.get('/oncall/policies').then(r => r.data),
  getPolicy: (id: string) => api.get(`/oncall/policies/${id}`).then(r => r.data),
  createPolicy: (data: any) => api.post('/oncall/policies', data).then(r => r.data),
  updatePolicy: (id: string, data: any) => api.put(`/oncall/policies/${id}`, data).then(r => r.data),
  deletePolicy: (id: string) => api.delete(`/oncall/policies/${id}`).then(r => r.data),
  addLevel: (policyId: string, data: any) => api.post(`/oncall/policies/${policyId}/levels`, data).then(r => r.data),
  updateLevel: (id: string, data: any) => api.put(`/oncall/levels/${id}`, data).then(r => r.data),
  deleteLevel: (id: string) => api.delete(`/oncall/levels/${id}`).then(r => r.data),
};
