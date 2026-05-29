import { Router } from 'express';
import { onCallController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createScheduleSchema, createRotationSchema, createOverrideSchema, createEscalationPolicySchema, createEscalationLevelSchema } from './schema';

const router = Router();
router.use(authenticate);

// Schedules
router.get('/schedules', (req, res, next) => onCallController.listSchedules(req as any, res, next));
router.post('/schedules', validate(createScheduleSchema), (req, res, next) => onCallController.createSchedule(req as any, res, next));
router.get('/schedules/:id', (req, res, next) => onCallController.getSchedule(req as any, res, next));
router.put('/schedules/:id', (req, res, next) => onCallController.updateSchedule(req as any, res, next));
router.delete('/schedules/:id', (req, res, next) => onCallController.deleteSchedule(req as any, res, next));
router.get('/schedules/:id/rotations', (req, res, next) => onCallController.getRotations(req as any, res, next));
router.post('/schedules/:id/rotations', validate(createRotationSchema), (req, res, next) => onCallController.addRotation(req as any, res, next));
router.put('/rotations/:id', (req, res, next) => onCallController.updateRotation(req as any, res, next));
router.delete('/rotations/:id', (req, res, next) => onCallController.deleteRotation(req as any, res, next));
router.post('/schedules/:id/overrides', validate(createOverrideSchema), (req, res, next) => onCallController.addOverride(req as any, res, next));
router.delete('/overrides/:id', (req, res, next) => onCallController.deleteOverride(req as any, res, next));
router.get('/whos-oncall', (req, res, next) => onCallController.getWhosOnCall(req as any, res, next));

// Escalation policies
router.get('/policies', (req, res, next) => onCallController.listPolicies(req as any, res, next));
router.post('/policies', validate(createEscalationPolicySchema), (req, res, next) => onCallController.createPolicy(req as any, res, next));
router.get('/policies/:id', (req, res, next) => onCallController.getPolicy(req as any, res, next));
router.put('/policies/:id', (req, res, next) => onCallController.updatePolicy(req as any, res, next));
router.delete('/policies/:id', (req, res, next) => onCallController.deletePolicy(req as any, res, next));
router.post('/policies/:id/levels', validate(createEscalationLevelSchema), (req, res, next) => onCallController.addLevel(req as any, res, next));
router.put('/levels/:id', (req, res, next) => onCallController.updateLevel(req as any, res, next));
router.delete('/levels/:id', (req, res, next) => onCallController.deleteLevel(req as any, res, next));

export default router;
