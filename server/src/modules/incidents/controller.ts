import { Response, NextFunction } from 'express';
import { incidentService } from './service';
import { incidentIntelligenceService } from './intelligence-service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class IncidentController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await incidentService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const incident = await incidentService.getById(req.params.id);
      if (!incident) { res.status(404).json({ error: 'Incident not found' }); return; }
      res.json(incident);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const incident = await incidentService.create(req.body, req.user!.id);
      // Analyze incident for AI suggestions asynchronously
      setImmediate(() => incidentIntelligenceService.analyzeIncident(incident.id).catch(console.error));
      res.status(201).json(incident);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const incident = await incidentService.update(req.params.id, req.body, req.user!.id);
      // Re-analyze on update and learn from resolution
      setImmediate(() => {
        incidentIntelligenceService.analyzeIncident(incident.id).catch(console.error);
        if (incident.state === 'resolved') {
          incidentIntelligenceService.learnFromResolution(
            incident.id,
            null,
            req.body.resolution_notes,
            null
          ).catch(console.error);
        }
      });
      res.json(incident);
    } catch (err) { next(err); }
  }

  async getSimilarIncidents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const similar = await incidentIntelligenceService.findSimilarIncidents(
        req.params.id,
        Number(req.query.limit) || 5
      );
      res.json(similar);
    } catch (err) { next(err); }
  }

  async getRootCauseSuggestions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const suggestions = await incidentIntelligenceService.predictRootCause(req.params.id);
      res.json(suggestions);
    } catch (err) { next(err); }
  }

  async getResolutionSuggestions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const suggestions = await incidentIntelligenceService.findResolutionSuggestions(
        req.params.id,
        Number(req.query.limit) || 5
      );
      res.json(suggestions);
    } catch (err) { next(err); }
  }

  async getSLAPrediction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const prediction = await incidentIntelligenceService.predictSLABreach(req.params.id);
      res.json(prediction);
    } catch (err) { next(err); }
  }
}

export const incidentController = new IncidentController();
