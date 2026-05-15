import { Request, Response, NextFunction } from 'express';
import { authService } from './service';
import { AuthRequest } from '../../types';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth/refresh',
      });

      res.json({ user: result.user, accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) {
        res.status(401).json({ error: 'No refresh token' });
        return;
      }
      const result = await authService.refresh(token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async me(req: AuthRequest, res: Response) {
    res.json({ user: req.user });
  }

  async logout(_req: Request, res: Response) {
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.json({ message: 'Logged out' });
  }
}

export const authController = new AuthController();
