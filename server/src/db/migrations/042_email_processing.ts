import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('email_accounts', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('address', 200).notNullable();
    t.string('protocol', 10).notNullable().defaultTo('imap'); // imap/pop3
    t.string('host', 200).notNullable();
    t.integer('port').notNullable().defaultTo(993);
    t.string('username', 200).notNullable();
    t.text('encrypted_password').notNullable();
    t.boolean('ssl').defaultTo(true);
    t.boolean('active').defaultTo(true);
    t.integer('polling_interval_seconds').defaultTo(300);
    t.uuid('default_assignment_group_id').references('id').inTable('assignment_groups').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('email_processing_rules', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('email_account_id').notNullable().references('id').inTable('email_accounts').onDelete('CASCADE');
    t.integer('priority').defaultTo(0);
    t.jsonb('conditions').defaultTo('{}'); // subject_contains, from_domain, body_contains
    t.string('action', 30).notNullable(); // create_incident/create_request/add_comment/ignore
    t.timestamps(true, true);
  });

  await knex.schema.createTable('processed_emails', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('email_account_id').notNullable().references('id').inTable('email_accounts').onDelete('CASCADE');
    t.string('message_id', 500);
    t.string('from_address', 200);
    t.string('subject', 500);
    t.timestamp('received_at');
    t.string('action_taken', 30);
    t.string('created_record_table', 50);
    t.uuid('created_record_id');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('processed_emails');
  await knex.schema.dropTableIfExists('email_processing_rules');
  await knex.schema.dropTableIfExists('email_accounts');
}
