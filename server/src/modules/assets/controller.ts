import { Response, NextFunction } from 'express';
import { assetService, licenseService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class AssetController {
  // ── Assets ────────────────────────────────────────

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await assetService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const asset = await assetService.getById(req.params.id);
      if (!asset) { res.status(404).json({ error: 'Asset not found' }); return; }
      res.json(asset);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const asset = await assetService.create(req.body, req.user!.id);
      res.status(201).json(asset);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const asset = await assetService.update(req.params.id, req.body, req.user!.id);
      res.json(asset);
    } catch (err) { next(err); }
  }

  // ── Lifecycle Events ──────────────────────────────

  async getLifecycleEvents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const events = await assetService.getLifecycleEvents(req.params.id);
      res.json(events);
    } catch (err) { next(err); }
  }

  async addLifecycleEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const event = await assetService.addLifecycleEvent(req.params.id, req.body, req.user!.id);
      res.status(201).json(event);
    } catch (err) { next(err); }
  }

  // ── Installations ─────────────────────────────────

  async getInstallations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const installations = await assetService.getInstallations(req.params.id);
      res.json(installations);
    } catch (err) { next(err); }
  }

  async addInstallation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const installation = await assetService.addInstallation(req.params.id, req.body, req.user!.id);
      res.status(201).json(installation);
    } catch (err) { next(err); }
  }

  async removeInstallation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await assetService.removeInstallation(req.params.id, req.params.installationId);
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── Models ────────────────────────────────────────

  async listModels(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const models = await assetService.listModels();
      res.json(models);
    } catch (err) { next(err); }
  }

  // ── Licenses ──────────────────────────────────────

  async listLicenses(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await licenseService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getLicenseById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const license = await licenseService.getById(req.params.id);
      if (!license) { res.status(404).json({ error: 'License not found' }); return; }
      res.json(license);
    } catch (err) { next(err); }
  }

  async createLicense(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const license = await licenseService.create(req.body, req.user!.id);
      res.status(201).json(license);
    } catch (err) { next(err); }
  }

  async updateLicense(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const license = await licenseService.update(req.params.id, req.body, req.user!.id);
      res.json(license);
    } catch (err) { next(err); }
  }
}

export const assetController = new AssetController();
