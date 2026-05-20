import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { createApproval } from '../../core/approval-engine';
import { notifyApprovalRequest } from '../../core/notification-engine';
import { AppError } from '../../middleware/error';

export class CatalogService {
  async listCategories() {
    return db('sc_categories').where('active', true).orderBy('sort_order');
  }

  async listItems(categoryId?: string) {
    const query = db('sc_catalog_items')
      .select('sc_catalog_items.*', 'sc_categories.name as category_name')
      .leftJoin('sc_categories', 'sc_categories.id', 'sc_catalog_items.category_id')
      .where('sc_catalog_items.active', true)
      .orderBy('sc_catalog_items.name');

    if (categoryId) {
      query.where('sc_catalog_items.category_id', categoryId);
    }

    return query;
  }

  async getItem(id: string) {
    const item = await db('sc_catalog_items')
      .select('sc_catalog_items.*', 'sc_categories.name as category_name')
      .leftJoin('sc_categories', 'sc_categories.id', 'sc_catalog_items.category_id')
      .where('sc_catalog_items.id', id)
      .first();

    if (item) {
      item.variables = await db('sc_item_variables')
        .where('catalog_item_id', id)
        .orderBy('sort_order');
    }

    return item;
  }

  async createRequest(catalogItemId: string, variables: Record<string, unknown>, userId: string) {
    const item = await db('sc_catalog_items').where('id', catalogItemId).first();
    if (!item) throw new AppError(404, 'Catalog item not found');

    const seqRaw = await db.raw("SELECT nextval('request_number_seq') as seq");
    const seqResult = seqRaw.rows?.[0] || seqRaw[0];
    const number = `REQ${seqResult.seq}`;

    const [request] = await db('sc_requests')
      .insert({
        number,
        catalog_item_id: catalogItemId,
        requested_by: userId,
        state: item.approval_required ? 'pending' : 'approved',
        variables: JSON.stringify(variables || {}),
      })
      .returning('*');

    // Create approval if required
    if (item.approval_required) {
      // Get approvers from the group manager
      const group = item.fulfillment_group_id
        ? await db('assignment_groups').where('id', item.fulfillment_group_id).first()
        : null;

      if (group?.manager_id) {
        await createApproval('sc_requests', request.id, [group.manager_id]);
        await notifyApprovalRequest(group.manager_id, 'sc_requests', number, `Request for: ${item.name}`);
      }
    }

    return request;
  }

  async listRequests(options: QueryOptions, userId?: string) {
    const query = db('sc_requests')
      .select(
        'sc_requests.*',
        'sc_catalog_items.name as catalog_item_name',
        'sc_catalog_items.icon as catalog_item_icon',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = sc_requests.requested_by) as requested_by_name"),
      )
      .leftJoin('sc_catalog_items', 'sc_catalog_items.id', 'sc_requests.catalog_item_id');

    if (userId) {
      query.where('sc_requests.requested_by', userId);
    }

    const { dataQuery, countQuery } = applyQueryOptions(query, 'sc_requests', {
      ...options,
      searchFields: ['number'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getRequest(id: string) {
    return db('sc_requests')
      .select(
        'sc_requests.*',
        'sc_catalog_items.name as catalog_item_name',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = sc_requests.requested_by) as requested_by_name"),
      )
      .leftJoin('sc_catalog_items', 'sc_catalog_items.id', 'sc_requests.catalog_item_id')
      .where('sc_requests.id', id)
      .orWhere('sc_requests.number', id)
      .first();
  }

  async updateRequestState(id: string, state: string) {
    const [updated] = await db('sc_requests').where('id', id).update({ state, updated_at: new Date() }).returning('*');
    return updated;
  }
}

export const catalogService = new CatalogService();
