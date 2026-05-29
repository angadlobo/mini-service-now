import { Response, NextFunction } from 'express';
import { businessServiceService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class ServiceMappingController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await businessServiceService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const service = await businessServiceService.getById(req.params.id);
      if (!service) { res.status(404).json({ error: 'Business service not found' }); return; }
      res.json(service);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const service = await businessServiceService.create(req.body, req.user!.id);
      res.status(201).json(service);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const service = await businessServiceService.update(req.params.id, req.body, req.user!.id);
      res.json(service);
    } catch (err) { next(err); }
  }

  async getServiceMap(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const map = await businessServiceService.getServiceMap();
      res.json(map);
    } catch (err) { next(err); }
  }

  // ── Offerings ──

  async getOfferings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const offerings = await businessServiceService.getOfferings(req.params.id);
      res.json(offerings);
    } catch (err) { next(err); }
  }

  async addOffering(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const offering = await businessServiceService.addOffering(req.params.id, req.body);
      res.status(201).json(offering);
    } catch (err) { next(err); }
  }

  async updateOffering(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const offering = await businessServiceService.updateOffering(req.params.offeringId, req.body);
      res.json(offering);
    } catch (err) { next(err); }
  }

  async deleteOffering(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await businessServiceService.deleteOffering(req.params.offeringId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  // ── Dependencies ──

  async getDependencies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const deps = await businessServiceService.getDependencies(req.params.id);
      res.json(deps);
    } catch (err) { next(err); }
  }

  async addDependency(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dep = await businessServiceService.addDependency(req.params.id, req.body);
      res.status(201).json(dep);
    } catch (err) { next(err); }
  }

  async removeDependency(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await businessServiceService.removeDependency(req.params.depId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  // ── CI Mappings ──

  async getCiMappings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const mappings = await businessServiceService.getCiMappings(req.params.id);
      res.json(mappings);
    } catch (err) { next(err); }
  }

  async addCiMapping(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const mapping = await businessServiceService.addCiMapping(req.params.id, req.body);
      res.status(201).json(mapping);
    } catch (err) { next(err); }
  }

  async removeCiMapping(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await businessServiceService.removeCiMapping(req.params.mapId);
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const serviceMappingController = new ServiceMappingController();
