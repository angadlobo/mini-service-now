import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/error';

export class AuthService {
  async login(username: string, password: string) {
    const user = await db('users').where({ username, active: true }).first();
    if (!user) throw new AppError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    const roles = await db('user_roles')
      .join('roles', 'roles.id', 'user_roles.role_id')
      .where('user_roles.user_id', user.id)
      .pluck('roles.name');

    const accessToken = this.generateAccessToken(user.id, user.username, roles);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        roles,
        active: user.active,
      },
      accessToken,
      refreshToken,
    };
  }

  async register(data: { username: string; email: string; password: string; first_name: string; last_name: string }) {
    const existing = await db('users')
      .where('username', data.username)
      .orWhere('email', data.email)
      .first();

    if (existing) {
      throw new AppError(409, 'Username or email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const [user] = await db('users')
      .insert({
        username: data.username,
        email: data.email,
        password_hash: passwordHash,
        first_name: data.first_name,
        last_name: data.last_name,
      })
      .returning('*');

    // Assign default 'user' role
    const userRole = await db('roles').where('name', 'user').first();
    if (userRole) {
      await db('user_roles').insert({ user_id: user.id, role_id: userRole.id });
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      roles: ['user'],
      active: user.active,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as { userId: string };
      const user = await db('users').where({ id: payload.userId, active: true }).first();
      if (!user) throw new AppError(401, 'User not found');

      const roles = await db('user_roles')
        .join('roles', 'roles.id', 'user_roles.role_id')
        .where('user_roles.user_id', user.id)
        .pluck('roles.name');

      const accessToken = this.generateAccessToken(user.id, user.username, roles);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          roles,
          active: user.active,
        },
        accessToken,
      };
    } catch {
      throw new AppError(401, 'Invalid refresh token');
    }
  }

  private generateAccessToken(userId: string, username: string, roles: string[]): string {
    return jwt.sign({ id: userId, username, roles }, config.jwt.secret, {
      expiresIn: '15m' as any,
    });
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, config.jwt.refreshSecret, {
      expiresIn: '7d' as any,
    });
  }
}

export const authService = new AuthService();
