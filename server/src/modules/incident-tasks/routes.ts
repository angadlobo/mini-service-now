import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as controller from './controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List tasks for an incident
router.get('/incidents/:incidentId/tasks', controller.listIncidentTasks);

// Get a specific task
router.get('/tasks/:taskId', controller.getIncidentTask);

// Create a task for an incident
router.post('/incidents/:incidentId/tasks', controller.createIncidentTask);

// Update a task
router.put('/tasks/:taskId', controller.updateIncidentTask);

// Delete a task
router.delete('/tasks/:taskId', controller.deleteIncidentTask);

export default router;
