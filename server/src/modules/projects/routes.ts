import { Router } from 'express';
import { projectController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createProjectSchema, updateProjectSchema,
  createProjectTaskSchema, updateProjectTaskSchema,
  createMilestoneSchema, updateMilestoneSchema,
  createMemberSchema, createTimeEntrySchema,
} from './schema';

const router = Router();

router.use(authenticate);

// ── Projects ─────────────────────────────────────────
router.get('/', (req, res, next) => projectController.list(req as any, res, next));
router.post('/', validate(createProjectSchema), (req, res, next) => projectController.create(req as any, res, next));
router.get('/:id', (req, res, next) => projectController.getById(req as any, res, next));
router.put('/:id', validate(updateProjectSchema), (req, res, next) => projectController.update(req as any, res, next));

// ── Tasks ────────────────────────────────────────────
router.get('/:id/tasks', (req, res, next) => projectController.listTasks(req as any, res, next));
router.post('/:id/tasks', validate(createProjectTaskSchema), (req, res, next) => projectController.createTask(req as any, res, next));
router.get('/:id/tasks/:taskId', (req, res, next) => projectController.getTask(req as any, res, next));
router.put('/:id/tasks/:taskId', validate(updateProjectTaskSchema), (req, res, next) => projectController.updateTask(req as any, res, next));

// ── Members ──────────────────────────────────────────
router.get('/:id/members', (req, res, next) => projectController.listMembers(req as any, res, next));
router.post('/:id/members', validate(createMemberSchema), (req, res, next) => projectController.addMember(req as any, res, next));
router.delete('/:id/members', (req, res, next) => projectController.removeMember(req as any, res, next));

// ── Milestones ───────────────────────────────────────
router.get('/:id/milestones', (req, res, next) => projectController.listMilestones(req as any, res, next));
router.post('/:id/milestones', validate(createMilestoneSchema), (req, res, next) => projectController.addMilestone(req as any, res, next));
router.put('/:id/milestones/:milestoneId', validate(updateMilestoneSchema), (req, res, next) => projectController.updateMilestone(req as any, res, next));

// ── Time Entries ─────────────────────────────────────
router.get('/:id/time-entries', (req, res, next) => projectController.listTimeEntries(req as any, res, next));
router.post('/:id/time-entries', validate(createTimeEntrySchema), (req, res, next) => projectController.addTimeEntry(req as any, res, next));

export default router;
