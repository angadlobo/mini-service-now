import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notification_channels', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('type').notNullable(); // email, slack, in_app
    t.string('name').notNullable();
    t.jsonb('config').defaultTo('{}'); // SMTP settings, webhook URL, etc.
    t.boolean('active').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('notification_preferences', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('channel_id').notNullable().references('id').inTable('notification_channels').onDelete('CASCADE');
    t.jsonb('events').defaultTo('[]'); // e.g. ["incident.assigned", "approval.requested"]
    t.boolean('active').defaultTo(true);
    t.timestamps(true, true);
    t.unique(['user_id', 'channel_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('notification_channels');
}
