import * as path from 'path';

export const environmentFiles = [path.resolve(__dirname, '../../.env'), path.resolve(__dirname, '../../../.env')];

export function databaseEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 5432),
    username: env.DB_USER || env.POSTGRES_USER || 'admin',
    password: env.DB_PASSWORD || env.POSTGRES_PASSWORD,
    database: env.DB_NAME || env.POSTGRES_DB || 'tele_rehab',
  };
}
