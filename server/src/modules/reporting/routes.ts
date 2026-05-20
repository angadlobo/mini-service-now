import { Router } from 'express';
import { reportingController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, (req, res, next) => reportingController.list(req, res, next));
router.get('/table-columns/:tableName', authenticate, (req, res, next) => reportingController.getTableColumns(req, res, next));
router.get('/:id', authenticate, (req, res, next) => reportingController.getById(req, res, next));
router.post('/', authenticate, requireRole('itil', 'admin'), (req, res, next) => reportingController.create(req, res, next));
router.put('/:id', authenticate, requireRole('itil', 'admin'), (req, res, next) => reportingController.update(req, res, next));
router.delete('/:id', authenticate, requireRole('itil', 'admin'), (req, res, next) => reportingController.delete(req, res, next));
router.get('/:id/run', authenticate, (req, res, next) => reportingController.run(req, res, next));
router.get('/:id/export', authenticate, (req, res, next) => reportingController.exportCsv(req, res, next));
router.get('/:id/schedules', authenticate, requireRole('admin'), (req, res, next) => reportingController.getSchedules(req, res, next));
router.post('/:id/schedules', authenticate, requireRole('admin'), (req, res, next) => reportingController.createSchedule(req, res, next));

export default router;
