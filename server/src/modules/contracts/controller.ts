import { Response, NextFunction } from 'express';
import { vendorService, contractService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

// ══════════════════════════════════════════════════════════
// Vendor Controller
// ══════════════════════════════════════════════════════════

export class VendorController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await vendorService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const vendor = await vendorService.getById(req.params.id);
      if (!vendor) { res.status(404).json({ error: 'Vendor not found' }); return; }
      res.json(vendor);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const vendor = await vendorService.create(req.body, req.user!.id);
      res.status(201).json(vendor);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const vendor = await vendorService.update(req.params.id, req.body, req.user!.id);
      res.json(vendor);
    } catch (err) { next(err); }
  }

  async getAssessments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assessments = await vendorService.getAssessments(req.params.id);
      res.json(assessments);
    } catch (err) { next(err); }
  }

  async addAssessment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assessment = await vendorService.addAssessment(req.params.id, req.body, req.user!.id);
      res.status(201).json(assessment);
    } catch (err) { next(err); }
  }
}

// ══════════════════════════════════════════════════════════
// Contract Controller
// ══════════════════════════════════════════════════════════

export class ContractController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await contractService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const contract = await contractService.getById(req.params.id);
      if (!contract) { res.status(404).json({ error: 'Contract not found' }); return; }
      res.json(contract);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const contract = await contractService.create(req.body, req.user!.id);
      res.status(201).json(contract);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const contract = await contractService.update(req.params.id, req.body, req.user!.id);
      res.json(contract);
    } catch (err) { next(err); }
  }

  async getLineItems(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await contractService.getLineItems(req.params.id);
      res.json(items);
    } catch (err) { next(err); }
  }

  async addLineItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await contractService.addLineItem(req.params.id, req.body);
      res.status(201).json(item);
    } catch (err) { next(err); }
  }

  async removeLineItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await contractService.removeLineItem(req.params.id, req.params.lineItemId);
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const vendorController = new VendorController();
export const contractController = new ContractController();
