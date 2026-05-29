import api from './client';

export const portalApi = {
  getHome: () => api.get('/portal/home').then(r => r.data),
  getMyTickets: () => api.get('/portal/my-tickets').then(r => r.data),
  getAnnouncements: () => api.get('/portal/announcements').then(r => r.data),
  createAnnouncement: (data: any) => api.post('/portal/announcements', data).then(r => r.data),
  updateAnnouncement: (id: string, data: any) => api.put(`/portal/announcements/${id}`, data).then(r => r.data),
  deleteAnnouncement: (id: string) => api.delete(`/portal/announcements/${id}`).then(r => r.data),
  getQuickLinks: () => api.get('/portal/quick-links').then(r => r.data),
  createQuickLink: (data: any) => api.post('/portal/quick-links', data).then(r => r.data),
  updateQuickLink: (id: string, data: any) => api.put(`/portal/quick-links/${id}`, data).then(r => r.data),
  deleteQuickLink: (id: string) => api.delete(`/portal/quick-links/${id}`).then(r => r.data),
  getThemes: () => api.get('/portal/themes').then(r => r.data),
  createTheme: (data: any) => api.post('/portal/themes', data).then(r => r.data),
  updateTheme: (id: string, data: any) => api.put(`/portal/themes/${id}`, data).then(r => r.data),
  activateTheme: (id: string) => api.put(`/portal/themes/${id}/activate`).then(r => r.data),
};
