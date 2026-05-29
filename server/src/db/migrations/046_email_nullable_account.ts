import { Knex } from 'knex';

/**
 * Inbound email can arrive via a provider webhook (SendGrid/Mailgun-style) that
 * isn't tied to a configured IMAP account, so processed_emails.email_account_id
 * must be nullable.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('processed_emails', (t) => {
    t.uuid('email_account_id').nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('processed_emails', (t) => {
    t.uuid('email_account_id').notNullable().alter();
  });
}
