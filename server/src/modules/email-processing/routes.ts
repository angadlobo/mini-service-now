import { Router } from 'express';
import { emailProcessingController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { inboundEmailSchema, createAccountSchema, createRuleSchema } from './schema';

const router = Router();

// ── Public inbound webhook (email provider posts parsed mail here) ──
router.post('/inbound', validate(inboundEmailSchema), (req, res, next) => emailProcessingController.inbound(req, res, next));

// ── Admin configuration ──
router.use(authenticate, requireRole('admin'));

router.get('/accounts', (req, res, next) => emailProcessingController.listAccounts(req, res, next));
router.post('/accounts', validate(createAccountSchema), (req, res, next) => emailProcessingController.createAccount(req, res, next));
router.put('/accounts/:id', (req, res, next) => emailProcessingController.updateAccount(req, res, next));
router.delete('/accounts/:id', (req, res, next) => emailProcessingController.deleteAccount(req, res, next));

router.get('/rules', (req, res, next) => emailProcessingController.listRules(req, res, next));
router.post('/rules', validate(createRuleSchema), (req, res, next) => emailProcessingController.createRule(req, res, next));
router.delete('/rules/:id', (req, res, next) => emailProcessingController.deleteRule(req, res, next));

router.get('/processed', (req, res, next) => emailProcessingController.processedLog(req, res, next));

export default router;
