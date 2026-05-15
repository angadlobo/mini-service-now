import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';

export class UserService {
  async list(options: QueryOptions) {
    const query = db('users')
      .select('users.id', 'users.username', 'users.email', 'users.first_name', 'users.last_name', 'users.active', 'users.created_at', 'users.updated_at');

    const { dataQuery, countQuery } = applyQueryOptions(query, 'users', {
      ...options,
      searchFields: ['username', 'email', 'first_name', 'last_name'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const user = await db('users')
      .select('id', 'username', 'email', 'first_name', 'last_name', 'active', 'created_at', 'updated_at')
      .where('id', id)
      .first();

    if (user) {
      const roles = await db('user_roles')
        .join('roles', 'roles.id', 'user_roles.role_id')
        .where('user_roles.user_id', id)
        .pluck('roles.name');
      (user as any).roles = roles;
    }

    return user;
  }

  async update(id: string, data: Partial<{ first_name: string; last_name: string; email: string; active: boolean }>) {
    const [user] = await db('users').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return user;
  }

  async updateRoles(userId: string, roleNames: string[]) {
    const roles = await db('roles').whereIn('name', roleNames).select('id');
    await db('user_roles').where('user_id', userId).del();
    if (roles.length > 0) {
      await db('user_roles').insert(roles.map((r: { id: string }) => ({ user_id: userId, role_id: r.id })));
    }
  }

  async getGroups() {
    return db('assignment_groups').where('active', true).orderBy('name');
  }

  async getGroupMembers(groupId: string) {
    return db('group_members')
      .join('users', 'users.id', 'group_members.user_id')
      .where('group_members.group_id', groupId)
      .select('users.id', 'users.username', 'users.first_name', 'users.last_name', 'users.email');
  }
}

export const userService = new UserService();
