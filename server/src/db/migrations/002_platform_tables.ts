import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Audit trail
  await knex.schema.createTable('sys_audit', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('table_name', 100).notNullable();
    t.uuid('record_id').notNullable();
    t.string('field_name', 100).notNullable();
    t.text('old_value');
    t.text('new_value');
    t.uuid('changed_by').notNullable().references('id').inTable('users');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['table_name', 'record_id']);
  });

  // Journal (comments & work notes)
  await knex.schema.createTable('sys_journal', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('table_name', 100).notNullable();
    t.uuid('record_id').notNullable();
    t.string('type', 20).notNullable(); // comment, work_note
    t.text('body').notNullable();
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['table_name', 'record_id']);
  });

  // Attachments
  await knex.schema.createTable('sys_attachment', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('table_name', 100).notNullable();
    t.uuid('record_id').notNullable();
    t.string('file_name', 255).notNullable();
    t.string('mime_type', 100).notNullable();
    t.integer('size').notNullable();
    t.string('storage_path', 500).notNullable();
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['table_name', 'record_id']);
  });

  // Notifications
  await knex.schema.createTable('sys_notification', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.text('body');
    t.string('link', 500);
    t.boolean('read').notNullable().defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['user_id', 'read']);
  });

  // SLA Definitions
  await knex.schema.createTable('sla_definitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 100).notNullable();
    t.string('table_name', 100).notNullable();
    t.jsonb('condition').defaultTo('{}');
    t.integer('duration_minutes').notNullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // SLA Instances
  await knex.schema.createTable('sla_instances', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('sla_definition_id').notNullable().references('id').inTable('sla_definitions');
    t.string('table_name', 100).notNullable();
    t.uuid('record_id').notNullable();
    t.timestamp('start_time').notNullable();
    t.timestamp('planned_end_time').notNullable();
    t.timestamp('actual_end_time');
    t.boolean('breached').notNullable().defaultTo(false);
    t.index(['table_name', 'record_id']);
  });

  // Approvals
  await knex.schema.createTable('approvals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('table_name', 100).notNullable();
    t.uuid('record_id').notNullable();
    t.uuid('approver_id').notNullable().references('id').inTable('users');
    t.string('state', 20).notNullable().defaultTo('requested');
    t.text('comments');
    t.timestamp('decided_at');
    t.timestamps(true, true);
    t.index(['table_name', 'record_id']);
    t.index(['approver_id', 'state']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('approvals');
  await knex.schema.dropTableIfExists('sla_instances');
  await knex.schema.dropTableIfExists('sla_definitions');
  await knex.schema.dropTableIfExists('sys_notification');
  await knex.schema.dropTableIfExists('sys_attachment');
  await knex.schema.dropTableIfExists('sys_journal');
  await knex.schema.dropTableIfExists('sys_audit');
}
