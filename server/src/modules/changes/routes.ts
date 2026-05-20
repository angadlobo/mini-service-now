import { Router } from 'express';
import { changeController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createChangeSchema, updateChangeSchema,
  createTemplateSchema, updateTemplateSchema,
  createMaintenanceWindowSchema, createBlackoutWindowSchema,
  createCabMeetingSchema, cabAgendaDecisionSchema, createApprovalRuleSchema,
} from './schema';

const router = Router();

router.use(authenticate);

// ── Core CRUD ──
router.get('/', (req, res, next) => changeController.list(req as any, res, next));
router.get('/metrics', (req, res, next) => changeController.getMetrics(req as any, res, next));
router.get('/calendar', (req, res, next) => changeController.getCalendar(req as any, res, next));
router.get('/standard-catalog', (req, res, next) => changeController.listStandardCatalog(req as any, res, next));
router.get('/:id', (req, res, next) => changeController.getById(req as any, res, next));
router.post('/', requireRole('itil'), validate(createChangeSchema), (req, res, next) => changeController.create(req as any, res, next));
router.put('/:id', requireRole('itil'), validate(updateChangeSchema), (req, res, next) => changeController.update(req as any, res, next));

// ── Risk & Impact ──
router.get('/:id/risk-assessment', (req, res, next) => changeController.assessRisk(req as any, res, next));
router.post('/:id/ai-risk-analysis', requireRole('itil'), (req, res, next) => changeController.aiRiskAnalysis(req as any, res, next));

// ── Conflicts ──
router.put('/conflicts/:conflictId/resolve', requireRole('itil'), (req, res, next) => changeController.resolveConflict(req as any, res, next));

// ── Linking ──
router.post('/:id/incidents', requireRole('itil'), (req, res, next) => changeController.linkIncident(req as any, res, next));
router.delete('/:id/incidents/:incidentId', requireRole('itil'), (req, res, next) => changeController.unlinkIncident(req as any, res, next));
router.post('/:id/problems', requireRole('itil'), (req, res, next) => changeController.linkProblem(req as any, res, next));
router.delete('/:id/problems/:problemId', requireRole('itil'), (req, res, next) => changeController.unlinkProblem(req as any, res, next));

// ── Templates ──
router.get('/templates/list', (req, res, next) => changeController.listTemplates(req as any, res, next));
router.get('/templates/:id', (req, res, next) => changeController.getTemplate(req as any, res, next));
router.post('/templates', requireRole('admin'), validate(createTemplateSchema), (req, res, next) => changeController.createTemplate(req as any, res, next));
router.put('/templates/:id', requireRole('admin'), validate(updateTemplateSchema), (req, res, next) => changeController.updateTemplate(req as any, res, next));
router.delete('/templates/:id', requireRole('admin'), (req, res, next) => changeController.deleteTemplate(req as any, res, next));
router.post('/templates/:templateId/create-change', requireRole('itil'), (req, res, next) => changeController.createFromTemplate(req as any, res, next));

// ── Approval Rules ──
router.get('/approval-rules/list', requireRole('admin'), (req, res, next) => changeController.listApprovalRules(req as any, res, next));
router.post('/approval-rules', requireRole('admin'), validate(createApprovalRuleSchema), (req, res, next) => changeController.createApprovalRule(req as any, res, next));
router.put('/approval-rules/:id', requireRole('admin'), (req, res, next) => changeController.updateApprovalRule(req as any, res, next));
router.delete('/approval-rules/:id', requireRole('admin'), (req, res, next) => changeController.deleteApprovalRule(req as any, res, next));

// ── CAB Management ──
router.get('/cab/meetings', (req, res, next) => changeController.listCabMeetings(req as any, res, next));
router.get('/cab/meetings/:id', (req, res, next) => changeController.getCabMeeting(req as any, res, next));
router.post('/cab/meetings', requireRole('admin'), validate(createCabMeetingSchema), (req, res, next) => changeController.createCabMeeting(req as any, res, next));
router.put('/cab/meetings/:id', requireRole('admin'), (req, res, next) => changeController.updateCabMeeting(req as any, res, next));
router.post('/cab/meetings/:id/agenda', requireRole('admin'), (req, res, next) => changeController.addToAgenda(req as any, res, next));
router.delete('/cab/meetings/:id/agenda/:changeId', requireRole('admin'), (req, res, next) => changeController.removeFromAgenda(req as any, res, next));
router.put('/cab/agenda/:itemId/decision', requireRole('admin'), validate(cabAgendaDecisionSchema), (req, res, next) => changeController.recordCabDecision(req as any, res, next));

// ── Maintenance Windows ──
router.get('/maintenance-windows/list', (req, res, next) => changeController.listMaintenanceWindows(req as any, res, next));
router.post('/maintenance-windows', requireRole('admin'), validate(createMaintenanceWindowSchema), (req, res, next) => changeController.createMaintenanceWindow(req as any, res, next));
router.put('/maintenance-windows/:id', requireRole('admin'), (req, res, next) => changeController.updateMaintenanceWindow(req as any, res, next));
router.delete('/maintenance-windows/:id', requireRole('admin'), (req, res, next) => changeController.deleteMaintenanceWindow(req as any, res, next));

// ── Blackout Windows ──
router.get('/blackout-windows/list', (req, res, next) => changeController.listBlackoutWindows(req as any, res, next));
router.post('/blackout-windows', requireRole('admin'), validate(createBlackoutWindowSchema), (req, res, next) => changeController.createBlackoutWindow(req as any, res, next));
router.put('/blackout-windows/:id', requireRole('admin'), (req, res, next) => changeController.updateBlackoutWindow(req as any, res, next));
router.delete('/blackout-windows/:id', requireRole('admin'), (req, res, next) => changeController.deleteBlackoutWindow(req as any, res, next));

export default router;
