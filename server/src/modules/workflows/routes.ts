import { Router } from 'express';
import { workflowController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Public webhook endpoint (no auth)
router.post('/webhook/:slug', (req, res, next) => workflowController.handleWebhook(req, res, next));

// Form tasks (authenticated users, not just admin)
router.get('/form-tasks', authenticate, (req, res, next) => workflowController.listFormTasks(req, res, next));
router.post('/form-tasks/:id/submit', authenticate, (req, res, next) => workflowController.submitFormTask(req, res, next));

// Import (admin only)
router.post('/import', authenticate, requireRole('admin'), (req, res, next) => workflowController.importWorkflow(req, res, next));

// Record-level executions (any authenticated user)
router.get('/executions/record/:tableName/:recordId', authenticate, (req, res, next) => workflowController.getExecutionsForRecord(req, res, next));

// Monitoring (admin only)
router.get('/monitoring/stats', authenticate, requireRole('admin'), (req, res, next) => workflowController.getMonitoringStats(req, res, next));
router.get('/monitoring/action-logs/:executionId', authenticate, requireRole('admin'), (req, res, next) => workflowController.getActionLogs(req, res, next));
router.post('/monitoring/retry/:executionId', authenticate, requireRole('admin'), (req, res, next) => workflowController.retryExecution(req, res, next));

// Webhooks management (admin only)
router.get('/webhooks', authenticate, requireRole('admin'), (req, res, next) => workflowController.listWebhooks(req, res, next));
router.post('/webhooks', authenticate, requireRole('admin'), (req, res, next) => workflowController.createWebhook(req, res, next));
router.delete('/webhooks/:id', authenticate, requireRole('admin'), (req, res, next) => workflowController.deleteWebhook(req, res, next));

// Triggers management (admin only)
router.get('/triggers', authenticate, requireRole('admin'), (req, res, next) => workflowController.listTriggers(req, res, next));
router.post('/triggers', authenticate, requireRole('admin'), (req, res, next) => workflowController.createTrigger(req, res, next));
router.delete('/triggers/:id', authenticate, requireRole('admin'), (req, res, next) => workflowController.deleteTrigger(req, res, next));

// Standard CRUD (admin only)
router.get('/', authenticate, requireRole('admin'), (req, res, next) => workflowController.list(req, res, next));
router.get('/executions', authenticate, requireRole('admin'), (req, res, next) => workflowController.getExecutions(req, res, next));
router.get('/:id', authenticate, requireRole('admin'), (req, res, next) => workflowController.getById(req, res, next));
router.get('/:id/export', authenticate, requireRole('admin'), (req, res, next) => workflowController.exportWorkflow(req, res, next));
router.post('/:id/simulate', authenticate, requireRole('admin'), (req, res, next) => workflowController.simulateWorkflow(req, res, next));
router.post('/', authenticate, requireRole('admin'), (req, res, next) => workflowController.create(req, res, next));
router.put('/:id', authenticate, requireRole('admin'), (req, res, next) => workflowController.update(req, res, next));
router.delete('/:id', authenticate, requireRole('admin'), (req, res, next) => workflowController.delete(req, res, next));

export default router;
