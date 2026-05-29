import { Response, NextFunction } from 'express';
import { portalService } from './service';
import { AuthRequest } from '../../types';

export class PortalController {
  // ── Portal Home ────────────────────────────────────

  async getHome(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await portalService.getPortalHome(req.user!.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── My Tickets ─────────────────────────────────────

  async getMyTickets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await portalService.getMyTickets(req.user!.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── Announcements ──────────────────────────────────

  async getAnnouncements(_req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await portalService.getAnnouncements()); } catch (err) { next(err); }
  }

  async createAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const announcement = await portalService.createAnnouncement(req.body, req.user!.id);
      res.status(201).json(announcement);
    } catch (err) { next(err); }
  }

  async updateAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const announcement = await portalService.updateAnnouncement(req.params.id, req.body);
      res.json(announcement);
    } catch (err) { next(err); }
  }

  async deleteAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await portalService.deleteAnnouncement(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }

  // ── Quick Links ────────────────────────────────────

  async getQuickLinks(_req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await portalService.getQuickLinks()); } catch (err) { next(err); }
  }

  async createQuickLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const link = await portalService.createQuickLink(req.body);
      res.status(201).json(link);
    } catch (err) { next(err); }
  }

  async updateQuickLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const link = await portalService.updateQuickLink(req.params.id, req.body);
      res.json(link);
    } catch (err) { next(err); }
  }

  async deleteQuickLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await portalService.deleteQuickLink(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }

  // ── Themes ─────────────────────────────────────────

  async listThemes(_req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await portalService.listThemes()); } catch (err) { next(err); }
  }

  async createTheme(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const theme = await portalService.createTheme(req.body);
      res.status(201).json(theme);
    } catch (err) { next(err); }
  }

  async updateTheme(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const theme = await portalService.updateTheme(req.params.id, req.body);
      res.json(theme);
    } catch (err) { next(err); }
  }

  async activateTheme(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const theme = await portalService.activateTheme(req.params.id);
      res.json(theme);
    } catch (err) { next(err); }
  }
}

export const portalController = new PortalController();
