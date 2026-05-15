import { Router } from 'express';
import { formBuilderController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, (req, res, next) => formBuilderController.listTemplates(req, res, next));
router.get('/:id', authenticate, (req, res, next) => formBuilderController.getTemplateById(req, res, next));
router.post('/', authenticate, requireRole('admin'), (req, res, next) => formBuilderController.createTemplate(req, res, next));
router.put('/:id', authenticate, requireRole('admin'), (req, res, next) => formBuilderController.updateTemplate(req, res, next));
router.delete('/:id', authenticate, requireRole('admin'), (req, res, next) => formBuilderController.deleteTemplate(req, res, next));
router.post('/:id/submit', authenticate, (req, res, next) => formBuilderController.submitForm(req, res, next));
router.get('/:id/submissions', authenticate, requireRole('admin'), (req, res, next) => formBuilderController.getSubmissions(req, res, next));

export default router;
