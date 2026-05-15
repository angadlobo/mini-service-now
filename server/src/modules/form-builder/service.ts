import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { AppError } from '../../middleware/error';

export class FormBuilderService {
  async listTemplates(options: QueryOptions) {
    const query = db('form_templates')
      .select(
        'form_templates.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = form_templates.created_by) as created_by_name"),
        db.raw("(SELECT COUNT(*) FROM form_fields WHERE form_fields.template_id = form_templates.id)::int as field_count"),
        db.raw("(SELECT COUNT(*) FROM form_submissions WHERE form_submissions.template_id = form_templates.id)::int as submission_count"),
      );
    const { dataQuery, countQuery } = applyQueryOptions(query, 'form_templates', {
      ...options,
      searchFields: ['name'],
    });
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getTemplateById(id: string) {
    const template = await db('form_templates').where('id', id).first();
    if (!template) throw new AppError(404, 'Form template not found');
    const fields = await db('form_fields').where('template_id', id).orderBy('sort_order');
    return { ...template, fields };
  }

  async createTemplate(data: Record<string, unknown>, userId: string) {
    const { fields, ...templateData } = data as any;
    const [template] = await db('form_templates').insert({ ...templateData, created_by: userId }).returning('*');

    if (fields && Array.isArray(fields)) {
      for (let i = 0; i < fields.length; i++) {
        await db('form_fields').insert({ ...fields[i], template_id: template.id, sort_order: i });
      }
    }

    return this.getTemplateById(template.id);
  }

  async updateTemplate(id: string, data: Record<string, unknown>) {
    const existing = await db('form_templates').where('id', id).first();
    if (!existing) throw new AppError(404, 'Form template not found');

    const { fields, ...templateData } = data as any;
    await db('form_templates').where('id', id).update({ ...templateData, updated_at: new Date() });

    if (fields && Array.isArray(fields)) {
      await db('form_fields').where('template_id', id).del();
      for (let i = 0; i < fields.length; i++) {
        await db('form_fields').insert({
          ...fields[i],
          id: undefined, // let DB generate new IDs
          template_id: id,
          sort_order: i,
        });
      }
    }

    return this.getTemplateById(id);
  }

  async deleteTemplate(id: string) {
    await db('form_templates').where('id', id).del();
  }

  async submitForm(templateId: string, data: Record<string, unknown>, userId: string) {
    const template = await db('form_templates').where('id', templateId).first();
    if (!template || !template.active) throw new AppError(404, 'Form template not found or inactive');

    const [submission] = await db('form_submissions')
      .insert({
        template_id: templateId,
        record_id: data.record_id || null,
        data: data.data || {},
        submitted_by: userId,
      })
      .returning('*');

    return submission;
  }

  async getSubmissions(templateId: string, options: QueryOptions) {
    const query = db('form_submissions')
      .where('template_id', templateId)
      .select(
        'form_submissions.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = form_submissions.submitted_by) as submitted_by_name"),
      )
      .orderBy('created_at', 'desc');

    const { dataQuery, countQuery } = applyQueryOptions(query, 'form_submissions', options);
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}

export const formBuilderService = new FormBuilderService();
