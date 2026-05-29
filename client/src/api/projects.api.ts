import api from './client';
import type { PaginatedResponse, QueryParams } from '@shared/interfaces';

export const projectsApi = {
  // ── Projects CRUD ──────────────────────────────────
  list: (params?: QueryParams) => api.get<PaginatedResponse<any>>('/projects', { params }).then(r => r.data),
  get: (id: string) => api.get<any>(`/projects/${id}`).then(r => r.data),
  create: (data: any) => api.post<any>('/projects', data).then(r => r.data),
  update: (id: string, data: any) => api.put<any>(`/projects/${id}`, data).then(r => r.data),

  // ── Tasks ──────────────────────────────────────────
  listTasks: (projectId: string, params?: QueryParams) => api.get<PaginatedResponse<any>>(`/projects/${projectId}/tasks`, { params }).then(r => r.data),
  getTask: (projectId: string, taskId: string) => api.get<any>(`/projects/${projectId}/tasks/${taskId}`).then(r => r.data),
  createTask: (projectId: string, data: any) => api.post<any>(`/projects/${projectId}/tasks`, data).then(r => r.data),
  updateTask: (projectId: string, taskId: string, data: any) => api.put<any>(`/projects/${projectId}/tasks/${taskId}`, data).then(r => r.data),

  // ── Members ────────────────────────────────────────
  getMembers: (projectId: string) => api.get<any[]>(`/projects/${projectId}/members`).then(r => r.data),
  addMember: (projectId: string, data: { user_id: string; role?: string }) => api.post<any>(`/projects/${projectId}/members`, data).then(r => r.data),
  removeMember: (projectId: string, userId: string) => api.delete(`/projects/${projectId}/members`, { data: { user_id: userId } }).then(r => r.data),

  // ── Milestones ─────────────────────────────────────
  getMilestones: (projectId: string) => api.get<any[]>(`/projects/${projectId}/milestones`).then(r => r.data),
  addMilestone: (projectId: string, data: any) => api.post<any>(`/projects/${projectId}/milestones`, data).then(r => r.data),
  updateMilestone: (projectId: string, milestoneId: string, data: any) => api.put<any>(`/projects/${projectId}/milestones/${milestoneId}`, data).then(r => r.data),

  // ── Time Entries ───────────────────────────────────
  getTimeEntries: (projectId: string) => api.get<any[]>(`/projects/${projectId}/time-entries`).then(r => r.data),
  addTimeEntry: (projectId: string, data: any) => api.post<any>(`/projects/${projectId}/time-entries`, data).then(r => r.data),
};
