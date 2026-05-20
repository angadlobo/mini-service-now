import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { AppError } from '../../middleware/error';
import { eventBus } from '../../core/event-bus';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class WorkflowService {
  async list(options: QueryOptions) {
    const query = db('workflow_rules')
      .select(
        'workflow_rules.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = workflow_rules.created_by) as created_by_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'workflow_rules', {
      ...options,
      searchFields: ['name', 'table_name'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    return db('workflow_rules').where('id', id).first();
  }

  async create(data: Record<string, unknown>, userId: string) {
    const payload = this.serializeJsonFields(data);
    const [rule] = await db('workflow_rules')
      .insert({ ...payload, created_by: userId })
      .returning('*');
    return rule;
  }

  async update(id: string, data: Record<string, unknown>) {
    const existing = await db('workflow_rules').where('id', id).first();
    if (!existing) throw new AppError(404, 'Workflow rule not found');
    const payload = this.serializeJsonFields(data);
    const [updated] = await db('workflow_rules').where('id', id).update({ ...payload, updated_at: new Date() }).returning('*');
    return updated;
  }

  /** Ensure jsonb fields are properly stringified for PostgreSQL */
  private serializeJsonFields(data: Record<string, unknown>): Record<string, unknown> {
    const result = { ...data };
    const jsonFields = ['conditions', 'actions', 'flow_layout', 'trigger_config', 'error_handling', 'tags'];
    for (const field of jsonFields) {
      if (result[field] !== undefined && typeof result[field] !== 'string') {
        result[field] = JSON.stringify(result[field]);
      }
    }
    return result;
  }

  async delete(id: string) {
    await db('workflow_rules').where('id', id).del();
  }

  async getExecutionsForRecord(tableName: string, recordId: string) {
    return db('workflow_executions')
      .join('workflow_rules', 'workflow_rules.id', 'workflow_executions.rule_id')
      .where('workflow_executions.table_name', tableName)
      .where('workflow_executions.record_id', recordId)
      .select(
        'workflow_executions.id',
        'workflow_rules.name as rule_name',
        'workflow_executions.status',
        'workflow_executions.trigger_type',
        'workflow_executions.duration_ms',
        'workflow_executions.created_at',
      )
      .orderBy('workflow_executions.created_at', 'desc');
  }

  async getExecutions(options: QueryOptions) {
    const query = db('workflow_executions')
      .join('workflow_rules', 'workflow_rules.id', 'workflow_executions.rule_id')
      .select('workflow_executions.*', 'workflow_rules.name as rule_name')
      .orderBy('workflow_executions.created_at', 'desc');

    const { dataQuery, countQuery } = applyQueryOptions(query, 'workflow_executions', options);
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ── Form Tasks ──────────────────────────────────────

  async listFormTasks(userId: string) {
    return db('workflow_form_tasks')
      .where({ assigned_to: userId, state: 'pending' })
      .join('form_templates', 'form_templates.id', 'workflow_form_tasks.form_template_id')
      .join('workflow_rules', 'workflow_rules.id', 'workflow_form_tasks.workflow_rule_id')
      .select(
        'workflow_form_tasks.*',
        'form_templates.name as form_template_name',
        'workflow_rules.name as workflow_name',
      )
      .orderBy('workflow_form_tasks.created_at', 'desc');
  }

  async submitFormTask(taskId: string, data: Record<string, unknown>, userId: string) {
    const task = await db('workflow_form_tasks').where('id', taskId).first();
    if (!task) throw new AppError(404, 'Form task not found');
    if (task.assigned_to !== userId) throw new AppError(403, 'Not authorized to submit this form task');
    if (task.state !== 'pending') throw new AppError(400, 'Form task is not pending');

    const [updated] = await db('workflow_form_tasks')
      .where('id', taskId)
      .update({
        state: 'completed',
        submitted_data: JSON.stringify(data),
        updated_at: new Date(),
      })
      .returning('*');

    // Emit form.submitted to resume the workflow
    eventBus.emit('form.submitted', {
      type: 'form.submitted',
      tableName: task.table_name,
      recordId: task.record_id,
      data: { executionId: task.execution_id, taskId, submittedData: data },
      userId,
    } as any);

    return updated;
  }

  // ── Simulate ─────────────────────────────────────────

  async simulateWorkflow(id: string, sampleRecord: Record<string, unknown>) {
    const rule = await db('workflow_rules').where('id', id).first();
    if (!rule) throw new AppError(404, 'Workflow rule not found');

    const conditions = (typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions) || {};
    const actions = (typeof rule.actions === 'string' ? JSON.parse(rule.actions) : rule.actions) || [];

    // Evaluate conditions step by step
    const conditionResults = this.evaluateConditionsDetailed(sampleRecord, conditions);
    const conditionsPassed = conditionResults.overall;

    // Build action trace (don't actually execute)
    const actionTrace = actions.map((action: any, i: number) => ({
      index: i,
      type: action.type,
      config: action.config,
      would_execute: conditionsPassed,
      description: this.describeAction(action),
    }));

    return {
      workflow_name: rule.name,
      table_name: rule.table_name,
      trigger_event: rule.trigger_event,
      sample_record: sampleRecord,
      conditions_passed: conditionsPassed,
      condition_details: conditionResults.details,
      actions: actionTrace,
    };
  }

  private evaluateConditionsDetailed(record: Record<string, unknown>, group: any): { overall: boolean; details: any[] } {
    if (!group || !group.conditions || group.conditions.length === 0) {
      return { overall: true, details: [{ result: true, reason: 'No conditions defined (auto-pass)' }] };
    }

    const details: any[] = [];
    const results: boolean[] = [];

    for (const c of group.conditions) {
      if ('logic' in c) {
        const nested = this.evaluateConditionsDetailed(record, c);
        details.push({ type: 'group', logic: c.logic, ...nested });
        results.push(nested.overall);
      } else {
        const fieldValue = record[c.field];
        const passed = this.evaluateSingleCondition(fieldValue, c.operator, c.value);
        details.push({
          field: c.field,
          operator: c.operator,
          expected: c.value,
          actual: fieldValue,
          passed,
        });
        results.push(passed);
      }
    }

    const overall = group.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
    return { overall, details };
  }

  private evaluateSingleCondition(fieldValue: unknown, operator: string, targetValue: unknown): boolean {
    switch (operator) {
      case 'equals': return String(fieldValue) === String(targetValue);
      case 'not_equals': return String(fieldValue) !== String(targetValue);
      case 'greater_than': return Number(fieldValue) > Number(targetValue);
      case 'less_than': return Number(fieldValue) < Number(targetValue);
      case 'contains': return String(fieldValue).toLowerCase().includes(String(targetValue).toLowerCase());
      case 'in': return Array.isArray(targetValue) && targetValue.includes(fieldValue);
      case 'is_empty': return !fieldValue || fieldValue === '';
      case 'is_not_empty': return !!fieldValue && fieldValue !== '';
      default: return false;
    }
  }

  private describeAction(action: any): string {
    const c = action.config || {};
    switch (action.type) {
      case 'set_field': return `Set "${c.field}" to "${c.value}"`;
      case 'change_state': return `Change state to "${c.state}"`;
      case 'assign_to': return `Assign to user ${c.user_id}`;
      case 'assign_to_group': return `Assign to group ${c.group_id}`;
      case 'send_notification': return `Send notification: "${c.title}"`;
      case 'create_journal_entry': return `Create ${c.journal_type || 'comment'} entry`;
      case 'launch_form': return `Launch form task (template: ${c.form_template_id})`;
      case 'delay': return `Delay ${c.duration_minutes} minutes`;
      case 'call_workflow': return `Call sub-workflow ${c.target_workflow_id}`;
      case 'create_approval': return `Create approval (${(c.approver_ids as string[])?.length || 0} approvers)`;
      case 'create_task': return `Create task in ${c.table_name || 'same table'}`;
      case 'http_request': return `HTTP ${c.method || 'GET'} ${c.url || ''}`;
      case 'send_email': return `Send email to ${c.to || '?'}`;
      case 'send_slack': return `Send Slack message`;
      case 'run_script': return `Run script`;
      case 'escalate': return `Escalate (${c.escalation_type || 'group'})`;
      case 'if_else': return `If/Else branch`;
      case 'switch': return `Switch on "${c.field}"`;
      case 'parallel': return `Parallel (${(c.branches as any[])?.length || 0} branches)`;
      case 'update_record': return `Update record in ${c.table_name || 'same table'}`;
      case 'log_message': return `Log: "${c.message}"`;
      default: return `Unknown action: ${action.type}`;
    }
  }

  // ── Export/Import ───────────────────────────────────

  async exportWorkflow(id: string) {
    const rule = await db('workflow_rules').where('id', id).first();
    if (!rule) throw new AppError(404, 'Workflow rule not found');

    // Find form templates referenced by launch_form actions
    const actions = (rule.actions || []) as Array<{ type: string; config: Record<string, unknown> }>;
    const formTemplateIds = actions
      .filter((a) => a.type === 'launch_form' && a.config.form_template_id)
      .map((a) => a.config.form_template_id as string);

    let formTemplates: any[] = [];
    if (formTemplateIds.length > 0) {
      formTemplates = await db('form_templates').whereIn('id', formTemplateIds);
    }

    // Strip internal fields from form templates for export
    const cleanTemplates = formTemplates.map((ft) => {
      const { id: _id, created_by, created_at, updated_at, ...rest } = ft;
      return { ...rest, _original_id: _id };
    });

    // Strip internal fields from rule for export
    const { id: _ruleId, created_by, created_at, updated_at, ...ruleData } = rule;

    return {
      format: 'msn-workflow-package',
      version: 1,
      exported_at: new Date().toISOString(),
      workflow: ruleData,
      form_templates: cleanTemplates,
      metadata: {
        name: rule.name,
        description: rule.description || '',
      },
    };
  }

  async importWorkflow(pkg: any, userId: string) {
    if (!pkg || pkg.format !== 'msn-workflow-package') {
      throw new AppError(400, 'Invalid workflow package format');
    }

    const workflowData = pkg.workflow;
    if (!workflowData || !workflowData.name) {
      throw new AppError(400, 'Package missing workflow data');
    }

    // Check for name conflicts
    const existing = await db('workflow_rules').where('name', workflowData.name).first();
    if (existing) {
      workflowData.name = `${workflowData.name} (imported)`;
    }

    // Import form templates first and build ID mapping
    const idMap: Record<string, string> = {};
    const formTemplates = pkg.form_templates || [];

    for (const ft of formTemplates) {
      const originalId = ft._original_id;
      const { _original_id, ...templateData } = ft;

      // Check for name conflict
      const existingFt = await db('form_templates').where('name', templateData.name).first();
      if (existingFt) {
        // Reuse existing form template
        idMap[originalId] = existingFt.id;
      } else {
        const [inserted] = await db('form_templates')
          .insert({ ...templateData, created_by: userId })
          .returning('*');
        idMap[originalId] = inserted.id;
      }
    }

    // Remap form_template_id references in actions
    const actions = (workflowData.actions || []).map((a: any) => {
      if (a.type === 'launch_form' && a.config.form_template_id && idMap[a.config.form_template_id]) {
        return {
          ...a,
          config: { ...a.config, form_template_id: idMap[a.config.form_template_id] },
        };
      }
      return a;
    });

    // Create the workflow rule
    const [rule] = await db('workflow_rules')
      .insert({
        ...workflowData,
        actions: JSON.stringify(actions),
        conditions: JSON.stringify(workflowData.conditions || {}),
        flow_layout: JSON.stringify(workflowData.flow_layout || {}),
        created_by: userId,
        version: 1,
      })
      .returning('*');

    return rule;
  }

  // ── Monitoring ─────────────────────────────────────

  async getMonitoringStats() {
    const [totalExecs] = await db('workflow_executions').count('id as count');
    const [successExecs] = await db('workflow_executions').where('status', 'success').count('id as count');
    const [errorExecs] = await db('workflow_executions').where('status', 'error').count('id as count');
    const [waitingExecs] = await db('workflow_executions').whereIn('status', ['waiting_for_form', 'waiting_for_approval', 'delayed']).count('id as count');
    const [runningExecs] = await db('workflow_executions').where('status', 'running').count('id as count');

    const avgDuration = await db('workflow_executions')
      .whereNotNull('duration_ms')
      .avg('duration_ms as avg');

    const recentErrors = await db('workflow_executions')
      .join('workflow_rules', 'workflow_rules.id', 'workflow_executions.rule_id')
      .where('workflow_executions.status', 'error')
      .select('workflow_executions.*', 'workflow_rules.name as rule_name')
      .orderBy('workflow_executions.created_at', 'desc')
      .limit(10);

    // Per-workflow stats
    const perWorkflow = await db('workflow_executions')
      .join('workflow_rules', 'workflow_rules.id', 'workflow_executions.rule_id')
      .select('workflow_rules.id', 'workflow_rules.name')
      .count('workflow_executions.id as total_executions')
      .sum(db.raw("CASE WHEN workflow_executions.status = 'error' THEN 1 ELSE 0 END as error_count"))
      .avg('workflow_executions.duration_ms as avg_duration_ms')
      .groupBy('workflow_rules.id', 'workflow_rules.name')
      .orderBy('total_executions', 'desc')
      .limit(20);

    return {
      total: Number((totalExecs as any).count),
      success: Number((successExecs as any).count),
      errors: Number((errorExecs as any).count),
      waiting: Number((waitingExecs as any).count),
      running: Number((runningExecs as any).count),
      avg_duration_ms: Math.round(Number((avgDuration as any[])?.[0]?.avg || 0)),
      recent_errors: recentErrors,
      per_workflow: perWorkflow,
    };
  }

  async getActionLogs(executionId: string) {
    return db('workflow_action_logs')
      .where('execution_id', executionId)
      .orderBy('action_index', 'asc');
  }

  async retryExecution(executionId: string) {
    const execution = await db('workflow_executions').where('id', executionId).first();
    if (!execution) throw new AppError(404, 'Execution not found');
    if (execution.status !== 'error') throw new AppError(400, 'Only failed executions can be retried');

    const rule = await db('workflow_rules').where('id', execution.rule_id).first();
    if (!rule) throw new AppError(404, 'Workflow rule not found');

    let record: Record<string, unknown> = {};
    try {
      record = await db(execution.table_name).where('id', execution.record_id).first() || {};
    } catch { record = {}; }

    // Import processWorkflowRule
    const { processWorkflowRule } = require('../../core/workflow-engine');

    const syntheticEvent = {
      type: rule.trigger_event,
      tableName: execution.table_name,
      recordId: execution.record_id,
      data: record,
      userId: rule.created_by,
    };

    await processWorkflowRule(rule, syntheticEvent, 'retry');
    return { message: 'Execution retried' };
  }

  // ── Webhook Management ─────────────────────────────

  async listWebhooks() {
    return db('workflow_webhooks')
      .join('workflow_rules', 'workflow_rules.id', 'workflow_webhooks.workflow_rule_id')
      .select('workflow_webhooks.*', 'workflow_rules.name as workflow_name');
  }

  async createWebhook(workflowRuleId: string) {
    const rule = await db('workflow_rules').where('id', workflowRuleId).first();
    if (!rule) throw new AppError(404, 'Workflow rule not found');

    const slug = `wh-${crypto.randomBytes(8).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');

    const [webhook] = await db('workflow_webhooks')
      .insert({
        workflow_rule_id: workflowRuleId,
        secret,
        path_slug: slug,
        active: true,
      })
      .returning('*');

    return webhook;
  }

  async deleteWebhook(id: string) {
    await db('workflow_webhooks').where('id', id).del();
  }

  // ── Trigger Management ─────────────────────────────

  async listTriggers(workflowRuleId?: string) {
    const query = db('workflow_triggers')
      .join('workflow_rules', 'workflow_rules.id', 'workflow_triggers.workflow_rule_id')
      .select('workflow_triggers.*', 'workflow_rules.name as workflow_name');

    if (workflowRuleId) {
      query.where('workflow_triggers.workflow_rule_id', workflowRuleId);
    }

    return query;
  }

  async createTrigger(data: { workflow_rule_id: string; type: string; config: Record<string, unknown> }) {
    const rule = await db('workflow_rules').where('id', data.workflow_rule_id).first();
    if (!rule) throw new AppError(404, 'Workflow rule not found');

    const [trigger] = await db('workflow_triggers')
      .insert({
        workflow_rule_id: data.workflow_rule_id,
        type: data.type,
        config: JSON.stringify(data.config),
        active: true,
      })
      .returning('*');

    // If scheduled, create a scheduled run entry
    if (data.type === 'scheduled') {
      const intervalMinutes = (data.config.interval_minutes as number) || 60;
      await db('workflow_scheduled_runs').insert({
        trigger_id: trigger.id,
        next_run_at: new Date(Date.now() + intervalMinutes * 60 * 1000),
        status: 'pending',
      });
    }

    return trigger;
  }

  async deleteTrigger(id: string) {
    await db('workflow_scheduled_runs').where('trigger_id', id).del();
    await db('workflow_triggers').where('id', id).del();
  }
}

export const workflowService = new WorkflowService();
