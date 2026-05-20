import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { tableRegistry } from '../../core/table-registry';
import { AppError } from '../../middleware/error';
import { ColumnDefinition, StateConfig, TableConfig } from '@shared/interfaces';

const TABLE_NAME_REGEX = /^x_[a-z0-9_]+$/;

export class AppEngineService {
  // ── Apps CRUD ──────────────────────────────────────
  async listApps(options: QueryOptions) {
    const query = db('app_engine_apps')
      .select(
        'app_engine_apps.*',
        db.raw("(SELECT COUNT(*) FROM app_engine_tables WHERE app_engine_tables.app_id = app_engine_apps.id)::int as table_count"),
      );
    const { dataQuery, countQuery } = applyQueryOptions(query, 'app_engine_apps', {
      ...options,
      searchFields: ['name', 'description'],
    });
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getAppById(id: string) {
    const app = await db('app_engine_apps').where('id', id).first();
    if (!app) throw new AppError(404, 'App not found');
    const tables = await db('app_engine_tables').where('app_id', id).orderBy('created_at');
    const pages = await db('app_engine_pages').where('app_id', id).orderBy('sort_order');
    const dashboards = await db('app_engine_dashboards').where('app_id', id).orderBy('created_at');
    return { ...app, tables, pages, dashboards };
  }

  async createApp(data: Record<string, unknown>, userId: string) {
    const slug = (data.slug as string || '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!slug) throw new AppError(400, 'Slug is required');
    const [app] = await db('app_engine_apps')
      .insert({ ...data, slug, created_by: userId })
      .returning('*');
    return app;
  }

  async updateApp(id: string, data: Record<string, unknown>) {
    const existing = await db('app_engine_apps').where('id', id).first();
    if (!existing) throw new AppError(404, 'App not found');
    const [updated] = await db('app_engine_apps').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async deleteApp(id: string) {
    // Tables with created DB tables should be dropped
    const tables = await db('app_engine_tables').where({ app_id: id, db_table_created: true });
    for (const t of tables) {
      await db.schema.dropTableIfExists(t.name);
      await db('app_engine_sequences').where('table_name', t.name).del();
      tableRegistry.unregister(t.name);
    }
    await db('app_engine_apps').where('id', id).del();
  }

  // ── Tables CRUD ────────────────────────────────────
  async listTables(options: QueryOptions & { app_id?: string }) {
    let query = db('app_engine_tables').select('app_engine_tables.*');
    if (options.app_id) {
      query = query.where('app_id', options.app_id);
    }
    const { dataQuery, countQuery } = applyQueryOptions(query, 'app_engine_tables', {
      ...options,
      searchFields: ['name', 'label'],
    });
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getTableById(id: string) {
    const table = await db('app_engine_tables').where('id', id).first();
    if (!table) throw new AppError(404, 'Table not found');
    return table;
  }

  async getTableByName(name: string) {
    const table = await db('app_engine_tables').where('name', name).first();
    if (!table) throw new AppError(404, 'Table not found');
    return table;
  }

  async createTable(data: Record<string, unknown>, userId: string) {
    const name = data.name as string;
    if (!TABLE_NAME_REGEX.test(name)) {
      throw new AppError(400, 'Table name must match pattern x_[a-z0-9_]+');
    }
    const [table] = await db('app_engine_tables')
      .insert({ ...data, created_by: userId })
      .returning('*');
    return table;
  }

  async updateTable(id: string, data: Record<string, unknown>) {
    const existing = await db('app_engine_tables').where('id', id).first();
    if (!existing) throw new AppError(404, 'Table not found');
    // Don't allow name changes after DB table is created
    if (existing.db_table_created && data.name && data.name !== existing.name) {
      throw new AppError(400, 'Cannot rename a table after its database table has been created');
    }
    const [updated] = await db('app_engine_tables').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async deleteTable(id: string) {
    const existing = await db('app_engine_tables').where('id', id).first();
    if (!existing) throw new AppError(404, 'Table not found');
    if (existing.db_table_created) {
      await db.schema.dropTableIfExists(existing.name);
      await db('app_engine_sequences').where('table_name', existing.name).del();
      tableRegistry.unregister(existing.name);
    }
    await db('app_engine_tables').where('id', id).del();
  }

  async createDatabaseTable(tableId: string) {
    const tableDef = await db('app_engine_tables').where('id', tableId).first();
    if (!tableDef) throw new AppError(404, 'Table not found');
    if (tableDef.db_table_created) throw new AppError(400, 'Database table already created');

    const columns = (tableDef.columns || []) as ColumnDefinition[];
    const states = tableDef.states as StateConfig | null;

    await db.schema.createTable(tableDef.name, (t) => {
      t.uuid('id').primary().defaultTo(db.fn.uuid());
      t.string('number').unique();
      if (states) t.string('state');

      for (const col of columns) {
        if (['number', 'state', 'id', 'assigned_to', 'assignment_group_id', 'created_by'].includes(col.name)) continue;
        switch (col.type) {
          case 'string': t.string(col.name); break;
          case 'text': t.text(col.name); break;
          case 'number': t.float(col.name); break;
          case 'boolean': t.boolean(col.name).defaultTo(false); break;
          case 'date': t.date(col.name); break;
          case 'datetime': t.timestamp(col.name); break;
          case 'select': t.string(col.name); break;
          case 'reference': t.uuid(col.name); break;
        }
      }

      t.uuid('assigned_to').references('id').inTable('users');
      t.uuid('assignment_group_id').references('id').inTable('assignment_groups');
      t.uuid('created_by').notNullable().references('id').inTable('users');
      t.timestamps(true, true);
    });

    await db('app_engine_sequences').insert({ table_name: tableDef.name, current_value: 999 });
    await db('app_engine_tables').where('id', tableId).update({ db_table_created: true });

    this.registerTable(tableDef);
    return { message: `Database table '${tableDef.name}' created successfully` };
  }

  async syncSchema(tableId: string) {
    const tableDef = await db('app_engine_tables').where('id', tableId).first();
    if (!tableDef) throw new AppError(404, 'Table not found');
    if (!tableDef.db_table_created) throw new AppError(400, 'Database table has not been created yet');

    const columns = (tableDef.columns || []) as ColumnDefinition[];
    const existingColumns = await db.raw(
      `SELECT column_name FROM information_schema.columns WHERE table_name = ?`,
      [tableDef.name]
    );
    const existingNames = new Set(existingColumns.rows.map((r: any) => r.column_name));

    const newColumns = columns.filter((c) =>
      !existingNames.has(c.name) &&
      !['number', 'state', 'id', 'assigned_to', 'assignment_group_id', 'created_by'].includes(c.name)
    );

    if (newColumns.length > 0) {
      await db.schema.alterTable(tableDef.name, (t) => {
        for (const col of newColumns) {
          switch (col.type) {
            case 'string': t.string(col.name); break;
            case 'text': t.text(col.name); break;
            case 'number': t.float(col.name); break;
            case 'boolean': t.boolean(col.name).defaultTo(false); break;
            case 'date': t.date(col.name); break;
            case 'datetime': t.timestamp(col.name); break;
            case 'select': t.string(col.name); break;
            case 'reference': t.uuid(col.name); break;
          }
        }
      });
    }

    // Re-register with updated columns
    this.registerTable(tableDef);
    return { message: `Schema synced. ${newColumns.length} column(s) added.` };
  }

  // ── Startup loader ─────────────────────────────────
  async loadCustomTables() {
    const tables = await db('app_engine_tables').where('db_table_created', true);
    for (const t of tables) {
      this.registerTable(t);
    }
    if (tables.length > 0) {
      console.log(`[AppEngine] Loaded ${tables.length} custom table(s) into registry`);
    }
  }

  private registerTable(tableDef: any) {
    const columns = (tableDef.columns || []) as ColumnDefinition[];
    const states = tableDef.states as StateConfig | null;

    const config: TableConfig = {
      name: tableDef.name,
      label: tableDef.label,
      numberPrefix: tableDef.number_prefix,
      numberSequence: `app_engine_sequences:${tableDef.name}`,
      columns: [
        { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
        ...columns,
        { name: 'assigned_to', label: 'Assigned To', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
        { name: 'assignment_group_id', label: 'Assignment Group', type: 'reference', reference: { table: 'assignment_groups', display: 'name' }, showInForm: true },
      ],
      ...(states ? { states } : {}),
    };

    tableRegistry.register(config);
  }

  // ── Pages CRUD ─────────────────────────────────────
  async getPageById(id: string) {
    const page = await db('app_engine_pages').where('id', id).first();
    if (!page) throw new AppError(404, 'Page not found');
    return page;
  }

  async listPages(appId: string) {
    return db('app_engine_pages').where('app_id', appId).orderBy('sort_order');
  }

  async createPage(data: Record<string, unknown>) {
    const [page] = await db('app_engine_pages').insert(data).returning('*');
    return page;
  }

  async updatePage(id: string, data: Record<string, unknown>) {
    const [updated] = await db('app_engine_pages').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async deletePage(id: string) {
    await db('app_engine_pages').where('id', id).del();
  }

  // ── Dashboards CRUD ────────────────────────────────
  async listDashboards(options: QueryOptions & { app_id?: string }) {
    let query = db('app_engine_dashboards').select('app_engine_dashboards.*');
    if (options.app_id) {
      query = query.where('app_id', options.app_id);
    }
    const { dataQuery, countQuery } = applyQueryOptions(query, 'app_engine_dashboards', {
      ...options,
      searchFields: ['name'],
    });
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getDashboardById(id: string) {
    const dashboard = await db('app_engine_dashboards').where('id', id).first();
    if (!dashboard) throw new AppError(404, 'Dashboard not found');
    return dashboard;
  }

  async createDashboard(data: Record<string, unknown>, userId: string) {
    const [dashboard] = await db('app_engine_dashboards')
      .insert({ ...data, created_by: userId })
      .returning('*');
    return dashboard;
  }

  async updateDashboard(id: string, data: Record<string, unknown>) {
    const [updated] = await db('app_engine_dashboards').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async deleteDashboard(id: string) {
    await db('app_engine_dashboards').where('id', id).del();
  }

  async getWidgetData(dashboardId: string, widgetId: string) {
    const dashboard = await db('app_engine_dashboards').where('id', dashboardId).first();
    if (!dashboard) throw new AppError(404, 'Dashboard not found');

    const widgets = (dashboard.layout || []) as any[];
    const widget = widgets.find((w: any) => w.id === widgetId);
    if (!widget) throw new AppError(404, 'Widget not found');

    const { table_name, type, aggregate, aggregate_field, filters, group_by, columns } = widget;

    // Validate table exists
    const hasTable = await db.schema.hasTable(table_name);
    if (!hasTable) throw new AppError(400, `Table '${table_name}' does not exist`);

    if (type === 'stat_card') {
      let query = db(table_name);
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== undefined && v !== null && v !== '') query = query.where(k, v);
        }
      }
      if (aggregate === 'count') {
        const result = await query.count('* as value').first();
        return { value: Number(result?.value || 0) };
      }
      if (aggregate === 'sum' && aggregate_field) {
        const result = await query.sum(`${aggregate_field} as value`).first();
        return { value: Number((result as any)?.value || 0) };
      }
      if (aggregate === 'avg' && aggregate_field) {
        const result = await query.avg(`${aggregate_field} as value`).first();
        return { value: Number((result as any)?.value || 0) };
      }
      const result = await query.count('* as value').first();
      return { value: Number(result?.value || 0) };
    }

    if (['bar_chart', 'pie_chart', 'line_chart'].includes(type) && group_by) {
      let query = db(table_name).select(group_by).count('* as count').groupBy(group_by);
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== undefined && v !== null && v !== '') query = query.where(k, v);
        }
      }
      const data = await query;
      return { data };
    }

    if (type === 'table' || type === 'list') {
      const cols = columns && columns.length > 0 ? columns : ['*'];
      let query = db(table_name).select(cols).orderBy('created_at', 'desc').limit(20);
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== undefined && v !== null && v !== '') query = query.where(k, v);
        }
      }
      const data = await query;
      return { data };
    }

    return { data: [] };
  }

  // ── Registered tables helper ───────────────────────
  getRegisteredTables() {
    return tableRegistry.getAll();
  }
}

export const appEngineService = new AppEngineService();
