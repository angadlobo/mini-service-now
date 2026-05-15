import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS kb_number_seq START 1000");

  await knex.schema.createTable('kb_categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 100).notNullable();
    t.uuid('parent_id').references('id').inTable('kb_categories');
    t.integer('sort_order').defaultTo(0);
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('kb_articles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('number', 20).notNullable().unique();
    t.uuid('category_id').references('id').inTable('kb_categories');
    t.string('title', 300).notNullable();
    t.text('body');
    t.string('state', 20).notNullable().defaultTo('draft');
    t.uuid('author_id').notNullable().references('id').inTable('users');
    t.integer('view_count').notNullable().defaultTo(0);
    t.integer('helpful_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.index('state');
    t.index('category_id');
  });

  // Full-text search index
  await knex.raw(`
    ALTER TABLE kb_articles ADD COLUMN IF NOT EXISTS search_vector tsvector;
    CREATE INDEX IF NOT EXISTS kb_articles_search_idx ON kb_articles USING gin(search_vector);

    CREATE OR REPLACE FUNCTION kb_articles_search_trigger() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS kb_articles_search_update ON kb_articles;
    CREATE TRIGGER kb_articles_search_update
      BEFORE INSERT OR UPDATE ON kb_articles
      FOR EACH ROW EXECUTE FUNCTION kb_articles_search_trigger();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('kb_articles');
  await knex.schema.dropTableIfExists('kb_categories');
  await knex.raw("DROP SEQUENCE IF EXISTS kb_number_seq");
}
