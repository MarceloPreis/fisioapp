import { databaseEnvironment, environmentFiles } from './environment';
describe('Database environment compatibility', () => {
  it('uses existing POSTGRES credentials without printing or replacing them', () => {
    expect(databaseEnvironment({ POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'synthetic', POSTGRES_DB: 'test_db' })).toMatchObject({ username: 'test', password: 'synthetic', database: 'test_db' });
  });
  it('gives DB settings precedence', () => {
    expect(databaseEnvironment({ DB_PASSWORD: 'new-synthetic', POSTGRES_PASSWORD: 'old-synthetic' }).password).toBe('new-synthetic');
  });
  it('does not invent a password', () => expect(databaseEnvironment({}).password).toBeUndefined());
  it('uses the same absolute environment paths from any working directory', () => {
    expect(environmentFiles[0].replace(/\\/g, '/')).toMatch(/\/api\/\.env$/);
    expect(environmentFiles[1].replace(/\\/g, '/')).toMatch(/\/fisioappweb\/\.env$/);
  });
});
