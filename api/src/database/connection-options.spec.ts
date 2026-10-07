import { databaseConnectionOptions } from './connection-options';

describe('PostgreSQL connection configuration', () => {
  it('separates administrative migrations from the runtime user', () => {
    const env = { DATABASE_URL: 'postgres://runtime:synthetic@localhost/db', MIGRATION_DATABASE_URL: 'postgres://migrator:synthetic@localhost/db', DB_SSL: 'true' };
    expect(databaseConnectionOptions(env).url).toBe(env.DATABASE_URL);
    expect(databaseConnectionOptions(env, true).url).toBe(env.MIGRATION_DATABASE_URL);
    expect(databaseConnectionOptions(env).extra).toEqual({ max: 5, options: '-c search_path=public,extensions' });
  });
  it('verifies TLS certificates and supports a supplied CA', () => {
    expect(databaseConnectionOptions({ DB_PASSWORD: 'synthetic', DB_SSL: 'true', DB_SSL_CA: 'line1\\nline2' }).ssl)
      .toEqual({ rejectUnauthorized: true, ca: 'line1\nline2' });
    expect(databaseConnectionOptions({ DB_PASSWORD: 'synthetic' }).ssl).toBe(false);
    expect(() => databaseConnectionOptions({ STORAGE_PROVIDER: 'supabase', DB_PASSWORD: 'synthetic' })).toThrow('DB_SSL');
  });
  it('rejects SSL connection-string overrides and invalid pool settings', () => {
    expect(() => databaseConnectionOptions({ DATABASE_URL: 'postgres://u:p@localhost/db?sslmode=no-verify', DB_SSL: 'true' })).toThrow('parâmetros SSL');
    expect(() => databaseConnectionOptions({ DB_PASSWORD: 'synthetic', DB_POOL_SIZE: '0' })).toThrow('DB_POOL_SIZE');
    expect(() => databaseConnectionOptions({})).toThrow('DB_PASSWORD');
  });
});
