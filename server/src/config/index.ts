export const config = {
  port: parseInt(process.env.SERVER_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessExpiry: '15m',
    refreshExpiry: '7d',
  },
  db: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'miniservicenow',
    user: process.env.POSTGRES_USER || 'msn_user',
    password: process.env.POSTGRES_PASSWORD || 'msn_password',
  },
  uploads: {
    dir: process.env.UPLOADS_DIR || './uploads',
    maxSize: 10 * 1024 * 1024, // 10MB
  },
};
