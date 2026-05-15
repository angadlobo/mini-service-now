import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { validateStateTransition } from '../../core/state-machine';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';

export class CmdbService {
  // CI Types
  async listTypes() {
    return db('ci_types').orderBy('name');
  }

  async createType(data: Record<string, unknown>) {
    const [type] = await db('ci_types').insert(data).returning('*');
    return type;
  }

  async updateType(id: string, data: Record<string, unknown>) {
    const [type] = await db('ci_types').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return type;
  }

  // CIs
  async listCis(options: QueryOptions) {
    const query = db('cis')
      .select(
        'cis.*',
        db.raw("(SELECT name FROM ci_types WHERE ci_types.id = cis.ci_type_id) as ci_type_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = cis.owner_id) as owner_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'cis', {
      ...options,
      searchFields: ['number', 'name', 'serial_number'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getCiById(id: string) {
    return db('cis')
      .select(
        'cis.*',
        db.raw("(SELECT name FROM ci_types WHERE ci_types.id = cis.ci_type_id) as ci_type_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = cis.owner_id) as owner_name"),
      )
      .where('cis.id', id)
      .orWhere('cis.number', id)
      .first();
  }

  async createCi(data: Record<string, unknown>, userId: string) {
    const [seqResult] = await db.raw("SELECT nextval('ci_number_seq') as seq");
    const number = `CI${seqResult.seq}`;

    const [ci] = await db('cis')
      .insert({
        number,
        ci_type_id: data.ci_type_id,
        name: data.name,
        serial_number: data.serial_number || null,
        status: 'inventory',
        owner_id: data.owner_id || null,
        location: data.location || null,
        cost: data.cost || 0,
        attributes: data.attributes || {},
        created_by: userId,
      })
      .returning('*');

    eventBus.emitRecordCreated('cis', ci.id, ci, userId);
    return ci;
  }

  async updateCi(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('cis').where('id', id).first();
    if (!existing) throw new AppError(404, 'CI not found');

    if (data.status && data.status !== existing.status) {
      validateStateTransition('cis', existing.status, data.status as string);
    }

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('cis').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('cis', id, changes, userId);

    eventBus.emitRecordUpdated('cis', id, updated, userId, existing);
    return updated;
  }

  // Relationships
  async getRelationships(ciId: string) {
    const outgoing = await db('ci_relationships')
      .join('cis', 'cis.id', 'ci_relationships.child_ci_id')
      .where('ci_relationships.parent_ci_id', ciId)
      .select('ci_relationships.*', 'cis.name as child_name', 'cis.number as child_number');

    const incoming = await db('ci_relationships')
      .join('cis', 'cis.id', 'ci_relationships.parent_ci_id')
      .where('ci_relationships.child_ci_id', ciId)
      .select('ci_relationships.*', 'cis.name as parent_name', 'cis.number as parent_number');

    return { outgoing, incoming };
  }

  async addRelationship(parentCiId: string, childCiId: string, type: string) {
    const [rel] = await db('ci_relationships')
      .insert({ parent_ci_id: parentCiId, child_ci_id: childCiId, type })
      .returning('*');
    return rel;
  }

  async removeRelationship(id: string) {
    await db('ci_relationships').where('id', id).del();
  }

  // Impact analysis - find all CIs affected by this CI (recursive downstream)
  async getImpactedCis(ciId: string) {
    const result = await db.raw(`
      WITH RECURSIVE impacted AS (
        SELECT child_ci_id as id, 1 as depth
        FROM ci_relationships WHERE parent_ci_id = ?
        UNION ALL
        SELECT cr.child_ci_id, impacted.depth + 1
        FROM ci_relationships cr
        INNER JOIN impacted ON cr.parent_ci_id = impacted.id
        WHERE impacted.depth < 10
      )
      SELECT DISTINCT cis.*, impacted.depth
      FROM impacted
      JOIN cis ON cis.id = impacted.id
      ORDER BY impacted.depth
    `, [ciId]);
    return result.rows || result;
  }
}

export const cmdbService = new CmdbService();
