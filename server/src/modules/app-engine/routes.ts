import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { appEngineController } from './controller';

const router = Router();

// All app engine admin routes require admin role
router.use(authenticate, requireRole('admin'));

// Apps
router.get('/apps', (req, res, next) => appEngineController.listApps(req, res, next));
router.get('/apps/:id', (req, res, next) => appEngineController.getApp(req, res, next));
router.post('/apps', (req: any, res, next) => appEngineController.createApp(req, res, next));
router.put('/apps/:id', (req, res, next) => appEngineController.updateApp(req, res, next));
router.delete('/apps/:id', (req, res, next) => appEngineController.deleteApp(req, res, next));

// Tables
router.get('/tables', (req, res, next) => appEngineController.listTables(req, res, next));
router.get('/tables/by-name/:name', (req, res, next) => appEngineController.getTableByName(req, res, next));
router.get('/tables/:id', (req, res, next) => appEngineController.getTable(req, res, next));
router.post('/tables', (req: any, res, next) => appEngineController.createTable(req, res, next));
router.put('/tables/:id', (req, res, next) => appEngineController.updateTable(req, res, next));
router.delete('/tables/:id', (req, res, next) => appEngineController.deleteTable(req, res, next));
router.post('/tables/:id/create-db', (req, res, next) => appEngineController.createDbTable(req, res, next));
router.post('/tables/:id/sync-schema', (req, res, next) => appEngineController.syncSchema(req, res, next));

// Pages
router.get('/pages', (req, res, next) => appEngineController.listPages(req, res, next));
router.post('/pages', (req, res, next) => appEngineController.createPage(req, res, next));
router.put('/pages/:id', (req, res, next) => appEngineController.updatePage(req, res, next));
router.delete('/pages/:id', (req, res, next) => appEngineController.deletePage(req, res, next));

// Dashboards
router.get('/dashboards', (req, res, next) => appEngineController.listDashboards(req, res, next));
router.get('/dashboards/:id', (req, res, next) => appEngineController.getDashboard(req, res, next));
router.post('/dashboards', (req: any, res, next) => appEngineController.createDashboard(req, res, next));
router.put('/dashboards/:id', (req, res, next) => appEngineController.updateDashboard(req, res, next));
router.delete('/dashboards/:id', (req, res, next) => appEngineController.deleteDashboard(req, res, next));
router.get('/dashboards/:id/widget-data/:widgetId', (req, res, next) => appEngineController.getWidgetData(req, res, next));

// Registered tables (system + custom)
router.get('/registered-tables', (req, res) => appEngineController.getRegisteredTables(req, res));

export default router;
