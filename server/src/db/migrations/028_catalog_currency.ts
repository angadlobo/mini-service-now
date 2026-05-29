import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const existing = await knex('sys_settings')
    .whereIn('key', ['catalog.currency_symbol', 'catalog.currency_suffix'])
    .pluck('key');

  const newSettings = [
    {
      key: 'catalog.currency_symbol',
      value: '$',
      category: 'catalog',
      description: 'Currency symbol displayed on catalog item prices (e.g. $, €, £, ¥)',
    },
    {
      key: 'catalog.currency_suffix',
      value: '/mo',
      category: 'catalog',
      description: 'Suffix shown after the price (e.g. /mo, /yr, or leave blank for one-time)',
    },
  ].filter((s) => !existing.includes(s.key));

  if (newSettings.length > 0) {
    await knex('sys_settings').insert(newSettings);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('sys_settings')
    .whereIn('key', ['catalog.currency_symbol', 'catalog.currency_suffix'])
    .del();
}
