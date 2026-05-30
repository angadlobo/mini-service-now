import { Router } from 'express';
import { incidentController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createIncidentSchema, updateIncidentSchema } from './schema';
import * as incidentTaskController from '../incident-tasks/controller';
import { createIncidentTaskSchema, updateIncidentTaskSchema } from '../incident-tasks/schema';

const router = Router();

router.use(authenticate);
router.get('/', (req, res, next) => incidentController.list(req as any, res, next));
router.get('/:id', (req, res, next) => incidentController.getById(req as any, res, next));
router.post('/', validate(createIncidentSchema), (req, res, next) => incidentController.create(req as any, res, next));
router.put('/:id', validate(updateIncidentSchema), (req, res, next) => incidentController.update(req as any, res, next));

// Incident Tasks routes (params named consistently with controller)
router.get('/:incidentId/tasks', (req, res, next) => incidentTaskController.listIncidentTasks(req as any, res, next));
router.post('/:incidentId/tasks', validate(createIncidentTaskSchema), (req, res, next) => incidentTaskController.createIncidentTask(req as any, res, next));
router.get('/:incidentId/tasks/:id', (req, res, next) => {
  req.params.taskId = req.params.id;
  incidentTaskController.getIncidentTask(req as any, res, next);
});
router.put('/:incidentId/tasks/:id', validate(updateIncidentTaskSchema), (req, res, next) => {
  req.params.taskId = req.params.id;
  incidentTaskController.updateIncidentTask(req as any, res, next);
});
router.delete('/:incidentId/tasks/:id', (req, res, next) => {
  req.params.taskId = req.params.id;
  incidentTaskController.deleteIncidentTask(req as any, res, next);
});

export default router;
