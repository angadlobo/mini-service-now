import { Request, Response, NextFunction } from 'express';
import { userService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class UserController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await userService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getById(req.params.id);
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      res.json(user);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.update(req.params.id, req.body);
      res.json(user);
    } catch (err) { next(err); }
  }

  async updateRoles(req: Request, res: Response, next: NextFunction) {
    try {
      await userService.updateRoles(req.params.id, req.body.roles);
      res.json({ message: 'Roles updated' });
    } catch (err) { next(err); }
  }

  async listGroups(_req: Request, res: Response, next: NextFunction) {
    try {
      const groups = await userService.getGroups();
      res.json(groups);
    } catch (err) { next(err); }
  }

  async getGroupMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await userService.getGroupMembers(req.params.id);
      res.json(members);
    } catch (err) { next(err); }
  }
}

export const userController = new UserController();
