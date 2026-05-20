import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Enhance changes table with new fields (idempotent) ──
  const hasImpact = await knex.schema.hasColumn('changes', 'impact');
  if (!hasImpact) {
    await knex.schema.alterTable('changes', (t) => {
      t.string('impact', 20).defaultTo('moderate');
      t.integer('risk_score').defaultTo(0);
      t.text('change_plan');
      t.text('implementation_plan');
      t.text('test_plan');
      t.text('communication_plan');
      t.text('rollback_plan');
      t.boolean('cab_required').defaultTo(false);
      t.uuid('cab_meeting_id').nullable();
      t.uuid('template_id').nullable();
      t.string('close_code', 50).nullable();
      t.text('close_notes');
      t.timestamp('actual_start').nullable();
      t.timestamp('actual_end').nullable();
      t.uuid('related_incident_id').nullable();
      t.uuid('related_problem_id').nullable();
      t.jsonb('ai_risk_analysis').nullable();
      t.jsonb('approval_config').nullable();
    });
  }

  // ── Change Templates ──
  await knex.schema.createTable('change_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 200).notNullable();
    t.text('description');
    t.string('type', 20).notNullable().defaultTo('normal');       // normal, standard, emergency
    t.string('category', 100).nullable();                         // grouping category
    t.string('risk', 20).defaultTo('moderate');
    t.string('impact', 20).defaultTo('moderate');
    t.integer('priority').defaultTo(4);
    t.text('change_plan');
    t.text('implementation_plan');
    t.text('test_plan');
    t.text('communication_plan');
    t.text('rollback_plan');
    t.text('backout_plan');
    t.text('justification');
    t.uuid('default_assignment_group_id').nullable().references('id').inTable('assignment_groups');
    t.jsonb('default_approvers').defaultTo('[]');                  // pre-configured approver IDs
    t.boolean('pre_approved').defaultTo(false);                    // for standard changes
    t.boolean('cab_required').defaultTo(false);
    t.boolean('active').defaultTo(true);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // ── Change Affected CIs (CMDB Integration) ──
  await knex.schema.createTable('change_affected_cis', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('change_id').notNullable().references('id').inTable('changes').onDelete('CASCADE');
    t.uuid('ci_id').notNullable().references('id').inTable('cis').onDelete('CASCADE');
    t.string('relationship_type', 50).defaultTo('affected');      // affected, impacted, target
    t.text('notes');
    t.timestamps(true, true);
    t.unique(['change_id', 'ci_id']);
    t.index('change_id');
    t.index('ci_id');
  });

  // ── Maintenance Windows ──
  await knex.schema.createTable('maintenance_windows', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 200).notNullable();
    t.text('description');
    t.timestamp('start_time').notNullable();
    t.timestamp('end_time').notNullable();
    t.string('recurrence', 50).nullable();                        // none, weekly, monthly, quarterly
    t.jsonb('recurrence_config').defaultTo('{}');                  // recurrence details
    t.boolean('active').defaultTo(true);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // ── Blackout Windows ──
  await knex.schema.createTable('blackout_windows', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 200).notNullable();
    t.text('reason');
    t.timestamp('start_time').notNullable();
    t.timestamp('end_time').notNullable();
    t.string('severity', 20).defaultTo('hard');                   // hard = no changes, soft = emergency only
    t.boolean('active').defaultTo(true);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // ── Change Conflicts ──
  await knex.schema.createTable('change_conflicts', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('change_id').notNullable().references('id').inTable('changes').onDelete('CASCADE');
    t.uuid('conflicting_change_id').notNullable().references('id').inTable('changes').onDelete('CASCADE');
    t.string('conflict_type', 50).notNullable();                  // schedule_overlap, ci_overlap, blackout
    t.text('description');
    t.string('resolution', 50).defaultTo('unresolved');           // unresolved, accepted, rescheduled, dismissed
    t.uuid('resolved_by').nullable().references('id').inTable('users');
    t.timestamp('resolved_at').nullable();
    t.timestamps(true, true);
    t.index('change_id');
  });

  // ── CAB Meetings ──
  await knex.schema.createTable('cab_meetings', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('title', 200).notNullable();
    t.text('description');
    t.timestamp('scheduled_date').notNullable();
    t.integer('duration_minutes').defaultTo(60);
    t.string('state', 20).defaultTo('scheduled');                 // scheduled, in_progress, completed, cancelled
    t.jsonb('attendees').defaultTo('[]');                          // array of user IDs
    t.text('minutes');                                             // meeting notes
    t.string('location', 255).nullable();
    t.uuid('chair_id').nullable().references('id').inTable('users');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // ── CAB Agenda Items (links changes to meetings) ──
  await knex.schema.createTable('cab_agenda_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('cab_meeting_id').notNullable().references('id').inTable('cab_meetings').onDelete('CASCADE');
    t.uuid('change_id').notNullable().references('id').inTable('changes').onDelete('CASCADE');
    t.integer('order').defaultTo(0);
    t.string('decision', 20).nullable();                          // approved, rejected, deferred, more_info
    t.text('discussion_notes');
    t.jsonb('votes').defaultTo('{}');                              // { userId: 'approve'|'reject'|'abstain' }
    t.timestamps(true, true);
    t.unique(['cab_meeting_id', 'change_id']);
  });

  // ── Change-Incident Linking Table ──
  await knex.schema.createTable('change_incidents', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('change_id').notNullable().references('id').inTable('changes').onDelete('CASCADE');
    t.uuid('incident_id').notNullable().references('id').inTable('incidents').onDelete('CASCADE');
    t.string('relationship', 50).defaultTo('caused_by');          // caused_by, resulted_in, related_to
    t.timestamps(true, true);
    t.unique(['change_id', 'incident_id']);
  });

  // ── Change-Problem Linking Table ──
  await knex.schema.createTable('change_problems', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('change_id').notNullable().references('id').inTable('changes').onDelete('CASCADE');
    t.uuid('problem_id').notNullable().references('id').inTable('problems').onDelete('CASCADE');
    t.string('relationship', 50).defaultTo('addresses');          // addresses, related_to
    t.timestamps(true, true);
    t.unique(['change_id', 'problem_id']);
  });

  // ── Change Approval Rules (configurable per-type) ──
  await knex.schema.createTable('change_approval_rules', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 200).notNullable();
    t.string('change_type', 20).notNullable();                    // normal, standard, emergency
    t.string('risk_level', 20).nullable();                        // high, moderate, low, or null = all
    t.string('impact_level', 20).nullable();                      // high, moderate, low, or null = all
    t.jsonb('approver_ids').defaultTo('[]');                       // specific user IDs
    t.uuid('approver_group_id').nullable().references('id').inTable('assignment_groups');
    t.boolean('cab_required').defaultTo(false);
    t.integer('approval_order').defaultTo(1);                     // for multi-stage
    t.string('approval_type', 20).defaultTo('all');               // all = unanimous, any = one approver suffices
    t.boolean('active').defaultTo(true);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('change_approval_rules');
  await knex.schema.dropTableIfExists('change_problems');
  await knex.schema.dropTableIfExists('change_incidents');
  await knex.schema.dropTableIfExists('cab_agenda_items');
  await knex.schema.dropTableIfExists('cab_meetings');
  await knex.schema.dropTableIfExists('change_conflicts');
  await knex.schema.dropTableIfExists('blackout_windows');
  await knex.schema.dropTableIfExists('maintenance_windows');
  await knex.schema.dropTableIfExists('change_affected_cis');
  await knex.schema.dropTableIfExists('change_templates');

  await knex.schema.alterTable('changes', (t) => {
    t.dropColumn('impact');
    t.dropColumn('risk_score');
    t.dropColumn('change_plan');
    t.dropColumn('implementation_plan');
    t.dropColumn('test_plan');
    t.dropColumn('communication_plan');
    t.dropColumn('rollback_plan');
    t.dropColumn('cab_required');
    t.dropColumn('cab_meeting_id');
    t.dropColumn('template_id');
    t.dropColumn('close_code');
    t.dropColumn('close_notes');
    t.dropColumn('actual_start');
    t.dropColumn('actual_end');
    t.dropColumn('related_incident_id');
    t.dropColumn('related_problem_id');
    t.dropColumn('ai_risk_analysis');
    t.dropColumn('approval_config');
  });
}
