import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

import { errorHandler, AppError } from './middleware/error';
import { authenticate } from './middleware/auth';
import { config } from './config';
import { db } from './config/database';

// Route imports
import authRoutes from './modules/auth/routes';
import userRoutes from './modules/users/routes';
import incidentRoutes from './modules/incidents/routes';
import changeRoutes from './modules/changes/routes';
import catalogRoutes from './modules/catalog/routes';
import knowledgeRoutes from './modules/knowledge/routes';
import approvalRoutes from './modules/approvals/routes';
import notificationRoutes from './modules/notifications/routes';
import dashboardRoutes from './modules/dashboard/routes';
import settingsRoutes from './modules/settings/routes';
import problemRoutes from './modules/problems/routes';
import cmdbRoutes from './modules/cmdb/routes';
import workflowRoutes from './modules/workflows/routes';
import integrationRoutes from './modules/integrations/routes';
import reportingRoutes from './modules/reporting/routes';
import formBuilderRoutes from './modules/form-builder/routes';
import aiRoutes from './modules/ai/routes';
import notificationPrefsRoutes from './modules/notification-prefs/routes';
import appEngineRoutes from './modules/app-engine/routes';
import dynamicCrudRoutes from './modules/app-engine/dynamic-crud.routes';
import releaseRoutes from './modules/releases/routes';
import portalRoutes from './modules/portal/routes';
import chatbotRoutes from './core/chatbot/routes';
import assetRoutes from './modules/assets/routes';
import contractRoutes from './modules/contracts/routes';
import projectRoutes from './modules/projects/routes';
import oncallRoutes from './modules/oncall/routes';
import eventRoutes from './modules/events/routes';
import surveyRoutes from './modules/surveys/routes';
import serviceMappingRoutes from './modules/service-mapping/routes';
import costManagementRoutes from './modules/cost-management/routes';
import businessContinuityRoutes from './modules/business-continuity/routes';
import demandRoutes from './modules/demand-management/routes';
import capacityRoutes from './modules/capacity-planning/routes';
import auditRoutes from './modules/audit/routes';
import slaRoutes from './modules/sla/routes';
import majorIncidentRoutes from './modules/major-incidents/routes';
import emailProcessingRoutes from './modules/email-processing/routes';

// Register modules
import { registerIncidentModule } from './modules/incidents/module';
import { registerChangeModule } from './modules/changes/module';
import { registerProblemModule } from './modules/problems/module';
import { registerCmdbModule } from './modules/cmdb/module';
import { registerReleaseModule } from './modules/releases/module';
import { registerAssetModule } from './modules/assets/module';
import { registerContractModule } from './modules/contracts/module';
import { registerProjectModule } from './modules/projects/module';
import { registerEventModule } from './modules/events/module';
import { registerServiceMappingModule } from './modules/service-mapping/module';
import { registerCostManagementModule } from './modules/cost-management/module';
import { registerBusinessContinuityModule } from './modules/business-continuity/module';
import { registerDemandManagementModule } from './modules/demand-management/module';
import { appEngineService } from './modules/app-engine/service';
import { registerAllProviders } from './integrations/providers/index';

registerIncidentModule();
registerChangeModule();
registerProblemModule();
registerCmdbModule();
registerReleaseModule();
registerAssetModule();
registerContractModule();
registerProjectModule();
registerEventModule();
registerServiceMappingModule();
registerCostManagementModule();
registerBusinessContinuityModule();
registerDemandManagementModule();

// Register integration providers
registerAllProviders();

// Load custom tables from app engine into table registry
appEngineService.loadCustomTables().catch((err) => {
  console.error('Failed to load custom tables:', err);
});

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Ensure uploads directory exists
const uploadsDir = path.resolve(config.uploads.dir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer for file uploads
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    cb(null, `${uuid()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: config.uploads.maxSize } });

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chatbot webhook routes (public, no auth middleware)
app.use('/api/chatbot', chatbotRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/changes', changeRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/cmdb', cmdbRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/reports', reportingRoutes);
app.use('/api/forms', formBuilderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notification-prefs', notificationPrefsRoutes);
app.use('/api/app-engine', appEngineRoutes);
app.use('/api/releases', releaseRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/oncall', oncallRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/service-mapping', serviceMappingRoutes);
app.use('/api/cost-management', costManagementRoutes);
app.use('/api/business-continuity', businessContinuityRoutes);
app.use('/api/demands', demandRoutes);
app.use('/api/capacity', capacityRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/major-incidents', majorIncidentRoutes);
app.use('/api/email', emailProcessingRoutes);
app.use('/api/x', dynamicCrudRoutes);

// ── Journal (comments/work notes) ────────────────────
app.get('/api/journal/:tableName/:recordId', authenticate, async (req, res, next) => {
  try {
    const entries = await db('sys_journal')
      .select(
        'sys_journal.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = sys_journal.created_by) as created_by_name"),
      )
      .where({ table_name: req.params.tableName, record_id: req.params.recordId })
      .orderBy('created_at', 'desc');
    res.json(entries);
  } catch (err) { next(err); }
});

app.post('/api/journal/:tableName/:recordId', authenticate, async (req: any, res, next) => {
  try {
    const [entry] = await db('sys_journal')
      .insert({
        table_name: req.params.tableName,
        record_id: req.params.recordId,
        type: req.body.type || 'comment',
        body: req.body.body,
        created_by: req.user.id,
      })
      .returning('*');
    res.status(201).json(entry);
  } catch (err) { next(err); }
});

// ── Attachments ──────────────────────────────────────
app.get('/api/attachments/:tableName/:recordId', authenticate, async (req, res, next) => {
  try {
    const attachments = await db('sys_attachment')
      .where({ table_name: req.params.tableName, record_id: req.params.recordId })
      .orderBy('created_at', 'desc');
    res.json(attachments);
  } catch (err) { next(err); }
});

app.post('/api/attachments/:tableName/:recordId', authenticate, upload.single('file'), async (req: any, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded');
    const [attachment] = await db('sys_attachment')
      .insert({
        table_name: req.params.tableName,
        record_id: req.params.recordId,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size,
        storage_path: req.file.filename,
        created_by: req.user.id,
      })
      .returning('*');
    res.status(201).json(attachment);
  } catch (err) { next(err); }
});

app.get('/api/attachments/download/:id', authenticate, async (req, res, next) => {
  try {
    const attachment = await db('sys_attachment').where('id', req.params.id).first();
    if (!attachment) throw new AppError(404, 'Attachment not found');
    const filePath = path.join(uploadsDir, attachment.storage_path);
    res.download(filePath, attachment.file_name);
  } catch (err) { next(err); }
});

app.delete('/api/attachments/:id', authenticate, async (req: any, res, next) => {
  try {
    const attachment = await db('sys_attachment').where('id', req.params.id).first();
    if (!attachment) throw new AppError(404, 'Attachment not found');
    const filePath = path.join(uploadsDir, attachment.storage_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await db('sys_attachment').where('id', req.params.id).del();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ── Audit trail ──────────────────────────────────────
app.get('/api/audit/:tableName/:recordId', authenticate, async (req, res, next) => {
  try {
    const entries = await db('sys_audit')
      .select(
        'sys_audit.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = sys_audit.changed_by) as changed_by_name"),
      )
      .where({ table_name: req.params.tableName, record_id: req.params.recordId })
      .orderBy('created_at', 'desc');
    res.json(entries);
  } catch (err) { next(err); }
});

// Error handler
app.use(errorHandler);

export default app;
