import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { dynamicCrudController } from './dynamic-crud.controller';

const router = Router();

router.use(authenticate);

router.get('/:tableName', (req, res, next) => dynamicCrudController.list(req, res, next));
router.post('/:tableName', (req: any, res, next) => dynamicCrudController.create(req, res, next));
router.get('/:tableName/:id', (req, res, next) => dynamicCrudController.getById(req, res, next));
router.put('/:tableName/:id', (req: any, res, next) => dynamicCrudController.update(req, res, next));
router.delete('/:tableName/:id', (req, res, next) => dynamicCrudController.delete(req, res, next));
router.get('/:tableName/:id/transitions', (req, res, next) => dynamicCrudController.getTransitions(req, res, next));

export default router;
