import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { tableRegistry } from '../../core/table-registry';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';

export class DynamicCrudService {
  async list(tableName: string, options: QueryOptions) {
    const tableDef = tableRegistry.get(tableName);
    if (!tableDef) throw new AppError(404, `Unknown table '${tableName}'`);

    const query = db(tableName).select(`${tableName}.*`);

    // Add reference display columns via subqueries
    for (const col of tableDef.columns) {
      if (col.type === 'reference' && col.reference) {
        query.select(
          db.raw(
            `(SELECT ${col.reference.display} FROM ${col.reference.table} WHERE ${col.reference.table}.id = ${tableName}.${col.name}) as ${col.name}_display`
          )
        );
      }
    }

    const searchFields = tableDef.columns
      .filter((c) => (c.type === 'string' || c.type === 'text') && c.showInList)
      .map((c) => c.name);

    const { dataQuery, countQuery } = applyQueryOptions(query, tableName, {
      ...options,
      searchFields: searchFields.length > 0 ? searchFields : ['number'],
    });
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(tableName: string, id: string) {
    const tableDef = tableRegistry.get(tableName);
    if (!tableDef) throw new AppError(404, `Unknown table '${tableName}'`);

    const query = db(tableName).where(`${tableName}.id`, id);

    for (const col of tableDef.columns) {
      if (col.type === 'reference' && col.reference) {
        query.select(
          db.raw(
            `(SELECT ${col.reference.display} FROM ${col.reference.table} WHERE ${col.reference.table}.id = ${tableName}.${col.name}) as ${col.name}_display`
          )
        );
      }
    }

    const record = await query.select(`${tableName}.*`).first();
    if (!record) throw new AppError(404, 'Record not found');
    return record;
  }

  async create(tableName: string, data: Record<string, unknown>, userId: string) {
    const tableDef = tableRegistry.get(tableName);
    if (!tableDef) throw new AppError(404, `Unknown table '${tableName}'`);

    // Auto-generate number using app_engine_sequences
    const [updated] = await db('app_engine_sequences')
      .where('table_name', tableName)
      .increment('current_value', 1)
      .returning('current_value');
    const number = `${tableDef.numberPrefix}${updated.current_value}`;

    const insertData: Record<string, unknown> = {
      number,
      created_by: userId,
    };

    // Set initial state if states defined
    if (tableDef.states) {
      insertData.state = tableDef.states.initial;
    }

    // Map fields from input data
    for (const col of tableDef.columns) {
      if (col.readonly || col.name === 'number') continue;
      if (data[col.name] !== undefined) {
        insertData[col.name] = data[col.name];
      }
    }

    // Copy standard fields
    if (data.assigned_to !== undefined) insertData.assigned_to = data.assigned_to;
    if (data.assignment_group_id !== undefined) insertData.assignment_group_id = data.assignment_group_id;

    const [record] = await db(tableName).insert(insertData).returning('*');

    // Audit trail
    await db('sys_audit').insert({
      table_name: tableName,
      record_id: record.id,
      field_name: '*',
      old_value: '',
      new_value: 'Record created',
      changed_by: userId,
    });

    eventBus.emitRecordCreated(tableName, record.id, record, userId);
    return record;
  }

  async update(tableName: string, id: string, data: Record<string, unknown>, userId: string) {
    const tableDef = tableRegistry.get(tableName);
    if (!tableDef) throw new AppError(404, `Unknown table '${tableName}'`);

    const existing = await db(tableName).where('id', id).first();
    if (!existing) throw new AppError(404, 'Record not found');

    // Validate state transition
    const stateChanging = data.state && data.state !== existing.state;
    if (stateChanging && tableDef.states) {
      const allowed = tableDef.states.transitions[existing.state] || [];
      if (!allowed.includes(data.state as string)) {
        throw new AppError(400, `Cannot transition from '${existing.state}' to '${data.state}'. Allowed: ${allowed.join(', ')}`);
      }
    }

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    for (const col of tableDef.columns) {
      if (col.readonly || col.name === 'number') continue;
      if (data[col.name] !== undefined) {
        updateData[col.name] = data[col.name];
      }
    }

    if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to;
    if (data.assignment_group_id !== undefined) updateData.assignment_group_id = data.assignment_group_id;

    const [updated] = await db(tableName).where('id', id).update(updateData).returning('*');

    // Audit trail for changed fields
    for (const [key, newVal] of Object.entries(updateData)) {
      if (key === 'updated_at') continue;
      const oldVal = existing[key];
      if (String(oldVal || '') !== String(newVal || '')) {
        await db('sys_audit').insert({
          table_name: tableName,
          record_id: id,
          field_name: key,
          old_value: String(oldVal || ''),
          new_value: String(newVal || ''),
          changed_by: userId,
        });
      }
    }

    if (stateChanging) {
      eventBus.emitStateChanged(tableName, id, updated, userId, existing);
    } else {
      eventBus.emitRecordUpdated(tableName, id, updated, userId, existing);
    }

    return updated;
  }

  async delete(tableName: string, id: string) {
    const tableDef = tableRegistry.get(tableName);
    if (!tableDef) throw new AppError(404, `Unknown table '${tableName}'`);

    const existing = await db(tableName).where('id', id).first();
    if (!existing) throw new AppError(404, 'Record not found');

    // Clean up polymorphic records
    await db('sys_journal').where({ table_name: tableName, record_id: id }).del();
    await db('sys_audit').where({ table_name: tableName, record_id: id }).del();
    await db('sys_attachment').where({ table_name: tableName, record_id: id }).del();

    await db(tableName).where('id', id).del();
    return { message: 'Record deleted' };
  }

  async getTransitions(tableName: string, id: string) {
    const tableDef = tableRegistry.get(tableName);
    if (!tableDef) throw new AppError(404, `Unknown table '${tableName}'`);

    if (!tableDef.states) return { current: null, transitions: [] };

    const record = await db(tableName).where('id', id).select('state').first();
    if (!record) throw new AppError(404, 'Record not found');

    const transitions = tableDef.states.transitions[record.state] || [];
    return { current: record.state, transitions };
  }
}

export const dynamicCrudService = new DynamicCrudService();
