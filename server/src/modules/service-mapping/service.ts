import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { AppError } from '../../middleware/error';

export class BusinessServiceService {
  async list(options: QueryOptions) {
    const query = db('business_services')
      .select(
        'business_services.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = business_services.owner_id) as owner_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'business_services', {
      ...options,
      searchFields: ['number', 'name', 'description', 'portfolio'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const service = await db('business_services')
      .select(
        'business_services.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = business_services.owner_id) as owner_name"),
      )
      .where('business_services.id', id)
      .orWhere('business_services.number', id)
      .first();

    return service;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('business_service_number_seq') as seq")).rows[0];
    const number = `BSV${String(seqResult.seq).padStart(7, '0')}`;

    const [service] = await db('business_services')
      .insert({
        number,
        name: data.name,
        description: data.description || null,
        owner_id: data.owner_id || null,
        status: data.status || 'active',
        criticality: data.criticality || 'medium',
        portfolio: data.portfolio || null,
        sla_definition_id: data.sla_definition_id || null,
      })
      .returning('*');

    await recordAudit('business_services', service.id, { action: { old: null, new: 'created' } }, userId);
    return service;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('business_services').where('id', id).first();
    if (!existing) throw new AppError(404, 'Business service not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('business_services').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('business_services', id, changes, userId);

    return updated;
  }

  // ── Offerings ──

  async getOfferings(serviceId: string) {
    return db('service_offerings')
      .where('business_service_id', serviceId)
      .orderBy('name', 'asc');
  }

  async addOffering(serviceId: string, data: Record<string, unknown>) {
    const service = await db('business_services').where('id', serviceId).first();
    if (!service) throw new AppError(404, 'Business service not found');

    const [offering] = await db('service_offerings')
      .insert({
        business_service_id: serviceId,
        name: data.name,
        description: data.description || null,
        status: data.status || 'active',
        availability_target: data.availability_target || null,
      })
      .returning('*');

    return offering;
  }

  async updateOffering(id: string, data: Record<string, unknown>) {
    const existing = await db('service_offerings').where('id', id).first();
    if (!existing) throw new AppError(404, 'Service offering not found');

    const [updated] = await db('service_offerings')
      .where('id', id)
      .update({ ...data, updated_at: new Date() })
      .returning('*');

    return updated;
  }

  async deleteOffering(id: string) {
    const existing = await db('service_offerings').where('id', id).first();
    if (!existing) throw new AppError(404, 'Service offering not found');

    await db('service_offerings').where('id', id).del();
  }

  // ── Dependencies ──

  async getDependencies(serviceId: string) {
    return db('service_dependencies')
      .select(
        'service_dependencies.*',
        db.raw("(SELECT name FROM business_services WHERE business_services.id = service_dependencies.depends_on_service_id) as depends_on_service_name"),
        db.raw("(SELECT name FROM business_services WHERE business_services.id = service_dependencies.service_id) as service_name"),
      )
      .where('service_dependencies.service_id', serviceId)
      .orWhere('service_dependencies.depends_on_service_id', serviceId);
  }

  async addDependency(serviceId: string, data: Record<string, unknown>) {
    const service = await db('business_services').where('id', serviceId).first();
    if (!service) throw new AppError(404, 'Business service not found');

    const dependsOn = await db('business_services').where('id', data.depends_on_service_id as string).first();
    if (!dependsOn) throw new AppError(404, 'Dependent service not found');

    if (serviceId === data.depends_on_service_id) {
      throw new AppError(400, 'A service cannot depend on itself');
    }

    const [dep] = await db('service_dependencies')
      .insert({
        service_id: serviceId,
        depends_on_service_id: data.depends_on_service_id,
        dependency_type: data.dependency_type || 'hard',
        description: data.description || null,
      })
      .returning('*');

    return dep;
  }

  async removeDependency(id: string) {
    const existing = await db('service_dependencies').where('id', id).first();
    if (!existing) throw new AppError(404, 'Service dependency not found');

    await db('service_dependencies').where('id', id).del();
  }

  // ── CI Mappings ──

  async getCiMappings(serviceId: string) {
    return db('service_ci_map')
      .select(
        'service_ci_map.*',
        db.raw("(SELECT name FROM cis WHERE cis.id = service_ci_map.ci_id) as ci_name"),
        db.raw("(SELECT class FROM cis WHERE cis.id = service_ci_map.ci_id) as ci_class"),
      )
      .where('service_ci_map.service_id', serviceId);
  }

  async addCiMapping(serviceId: string, data: Record<string, unknown>) {
    const service = await db('business_services').where('id', serviceId).first();
    if (!service) throw new AppError(404, 'Business service not found');

    const [mapping] = await db('service_ci_map')
      .insert({
        service_id: serviceId,
        ci_id: data.ci_id,
        role: data.role || 'provides',
      })
      .returning('*');

    return mapping;
  }

  async removeCiMapping(id: string) {
    const existing = await db('service_ci_map').where('id', id).first();
    if (!existing) throw new AppError(404, 'CI mapping not found');

    await db('service_ci_map').where('id', id).del();
  }

  // ── Service Map ──

  async getServiceMap() {
    const services = await db('business_services')
      .select('id', 'name', 'number', 'status', 'criticality')
      .orderBy('name', 'asc');

    const dependencies = await db('service_dependencies')
      .select('id', 'service_id', 'depends_on_service_id', 'dependency_type');

    const ciMappings = await db('service_ci_map')
      .select(
        'service_ci_map.*',
        db.raw("(SELECT name FROM cis WHERE cis.id = service_ci_map.ci_id) as ci_name"),
      );

    return { services, dependencies, ciMappings };
  }
}

export const businessServiceService = new BusinessServiceService();
