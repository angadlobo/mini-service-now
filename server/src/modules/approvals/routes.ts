import { Router } from 'express';
import { approvalController } from './controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/mine', (req, res, next) => approvalController.listMine(req as any, res, next));
router.put('/:id/decide', (req, res, next) => approvalController.decide(req as any, res, next));
router.get('/:tableName/:recordId', (req, res, next) => approvalController.getForRecord(req as any, res, next));

export default router;
