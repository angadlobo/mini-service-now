import api from './client';

export const appEngineApi = {
  // Apps (listApps returns paginated { data, total, ... } — extract the array)
  listApps: (params?: Record<string, unknown>) =>
    api.get('/app-engine/apps', { params }).then((r) => r.data?.data ?? r.data),
  getApp: (id: string) =>
    api.get(`/app-engine/apps/${id}`).then((r) => r.data),
  createApp: (data: Record<string, unknown>) =>
    api.post('/app-engine/apps', data).then((r) => r.data),
  updateApp: (id: string, data: Record<string, unknown>) =>
    api.put(`/app-engine/apps/${id}`, data).then((r) => r.data),
  deleteApp: (id: string) =>
    api.delete(`/app-engine/apps/${id}`).then((r) => r.data),

  // Tables (listTables returns paginated — extract the array)
  listTables: (params?: Record<string, unknown>) =>
    api.get('/app-engine/tables', { params }).then((r) => r.data?.data ?? r.data),
  getTable: (id: string) =>
    api.get(`/app-engine/tables/${id}`).then((r) => r.data),
  getTableByName: (name: string) =>
    api.get(`/app-engine/tables/by-name/${name}`).then((r) => r.data),
  createTable: (data: Record<string, unknown>) =>
    api.post('/app-engine/tables', data).then((r) => r.data),
  updateTable: (id: string, data: Record<string, unknown>) =>
    api.put(`/app-engine/tables/${id}`, data).then((r) => r.data),
  deleteTable: (id: string) =>
    api.delete(`/app-engine/tables/${id}`).then((r) => r.data),
  createDbTable: (id: string) =>
    api.post(`/app-engine/tables/${id}/create-db`).then((r) => r.data),
  syncSchema: (id: string) =>
    api.post(`/app-engine/tables/${id}/sync-schema`).then((r) => r.data),

  // Pages
  listPages: (appId: string) =>
    api.get('/app-engine/pages', { params: { app_id: appId } }).then((r) => r.data),
  getPage: (id: string) =>
    api.get(`/app-engine/pages/${id}`).then((r) => r.data),
  createPage: (data: Record<string, unknown>) =>
    api.post('/app-engine/pages', data).then((r) => r.data),
  updatePage: (id: string, data: Record<string, unknown>) =>
    api.put(`/app-engine/pages/${id}`, data).then((r) => r.data),
  deletePage: (id: string) =>
    api.delete(`/app-engine/pages/${id}`).then((r) => r.data),

  // Dashboards (listDashboards returns paginated — extract the array)
  listDashboards: (params?: Record<string, unknown>) =>
    api.get('/app-engine/dashboards', { params }).then((r) => r.data?.data ?? r.data),
  getDashboard: (id: string) =>
    api.get(`/app-engine/dashboards/${id}`).then((r) => r.data),
  createDashboard: (data: Record<string, unknown>) =>
    api.post('/app-engine/dashboards', data).then((r) => r.data),
  updateDashboard: (id: string, data: Record<string, unknown>) =>
    api.put(`/app-engine/dashboards/${id}`, data).then((r) => r.data),
  deleteDashboard: (id: string) =>
    api.delete(`/app-engine/dashboards/${id}`).then((r) => r.data),
  getWidgetData: (dashboardId: string, widgetId: string) =>
    api.get(`/app-engine/dashboards/${dashboardId}/widget-data/${widgetId}`).then((r) => r.data),

  // Registered tables (system + custom)
  getRegisteredTables: () =>
    api.get('/app-engine/registered-tables').then((r) => r.data),

  // Dynamic CRUD
  listRecords: (tableName: string, params?: Record<string, unknown>) =>
    api.get(`/x/${tableName}`, { params }).then((r) => r.data),
  getRecord: (tableName: string, id: string) =>
    api.get(`/x/${tableName}/${id}`).then((r) => r.data),
  createRecord: (tableName: string, data: Record<string, unknown>) =>
    api.post(`/x/${tableName}`, data).then((r) => r.data),
  updateRecord: (tableName: string, id: string, data: Record<string, unknown>) =>
    api.put(`/x/${tableName}/${id}`, data).then((r) => r.data),
  deleteRecord: (tableName: string, id: string) =>
    api.delete(`/x/${tableName}/${id}`).then((r) => r.data),
  getTransitions: (tableName: string, id: string) =>
    api.get(`/x/${tableName}/${id}/transitions`).then((r) => r.data),
};
