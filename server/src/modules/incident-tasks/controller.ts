import { Request, Response } from 'express';
import { incidentTaskService } from './service';
import { createIncidentTaskSchema, updateIncidentTaskSchema } from './schema';
import { AppError } from '../../middleware/error';

export async function listIncidentTasks(req: Request, res: Response) {
  const { incidentId } = req.params;
  const { page, pageSize, search, sortBy, sortOrder } = req.query;

  const tasks = await incidentTaskService.listByIncident(incidentId, {
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 50,
    search: search as string,
    sortBy: sortBy as string,
    sortOrder: (sortOrder as string) || 'asc',
  });

  res.json(tasks);
}

export async function getIncidentTask(req: Request, res: Response) {
  const { taskId } = req.params;
  const task = await incidentTaskService.getById(taskId);

  if (!task) throw new AppError(404, 'Task not found');
  res.json(task);
}

export async function createIncidentTask(req: Request, res: Response) {
  const { incidentId } = req.params;
  const data = createIncidentTaskSchema.parse(req.body);

  const task = await incidentTaskService.create(incidentId, data, req.user!.id);
  res.status(201).json(task);
}

export async function updateIncidentTask(req: Request, res: Response) {
  const { taskId } = req.params;
  const data = updateIncidentTaskSchema.parse(req.body);

  const task = await incidentTaskService.update(taskId, data, req.user!.id);
  res.json(task);
}

export async function deleteIncidentTask(req: Request, res: Response) {
  const { taskId } = req.params;
  await incidentTaskService.delete(taskId, req.user!.id);
  res.status(204).send();
}
