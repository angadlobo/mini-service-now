import knex, { Knex } from 'knex';
import { config } from './index';
import { logger } from './logger';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: __dirname + '/../db/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: __dirname + '/../db/seeds',
    extension: 'ts',
  },
};

export const db: Knex = knex(knexConfig);

export async function initDatabase(): Promise<void> {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection established');
    await db.migrate.latest();
    logger.info('Migrations complete');
    await db.seed.run();
    logger.info('Seeds complete');
  } catch (err) {
    logger.error('Database initialization failed', err);
    throw err;
  }
}

export default knexConfig;
