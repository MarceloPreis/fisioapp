import { readFileSync } from 'fs';
import { databaseEnvironment } from './environment';

// Shared by the API and migration CLI; certificate checks stay enabled.
export function databaseConnectionOptions(env: NodeJS.ProcessEnv = process.env, migrations = false) {
  const url = (migrations && env.MIGRATION_DATABASE_URL) || env.DATABASE_URL;
  const poolSize = Number(env.DB_POOL_SIZE || 5);
  if (!Number.isInteger(poolSize) || poolSize < 1 || poolSize > 20) throw new Error('DB_POOL_SIZE deve estar entre 1 e 20.');
  if (env.STORAGE_PROVIDER === 'supabase' && env.DB_SSL !== 'true') throw new Error('A validação Supabase exige DB_SSL=true.');
  if (url) {
    const parsed = new URL(url);
    if (['sslmode', 'sslcert', 'sslkey', 'sslrootcert'].some(key => parsed.searchParams.has(key))) {
      throw new Error('Remova parâmetros SSL da URL; configure DB_SSL e DB_SSL_CA ou DB_SSL_CA_FILE.');
    }
  } else if (!databaseEnvironment(env).password) {
    throw new Error('Configure DB_PASSWORD, POSTGRES_PASSWORD ou DATABASE_URL.');
  }
  const ca = env.DB_SSL_CA?.replace(/\\n/g, '\n') || (env.DB_SSL_CA_FILE ? readFileSync(env.DB_SSL_CA_FILE, 'utf8') : undefined);
  return {
    // Migrations provision extensions; the runtime account must not require DDL privileges.
    installExtensions: false,
    ...(url ? { url } : databaseEnvironment(env)),
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) } : false as const,
    extra: { max: poolSize, options: '-c search_path=public,extensions' },
  };
}
