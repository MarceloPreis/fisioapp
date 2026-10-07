import { storageSettings } from './storage-settings';

describe('Storage deployment settings', () => {
  it('keeps local MinIO as the default with the original 512 MiB limit', () => {
    expect(storageSettings({})).toEqual({ provider: 'minio', maxVideoBytes: 512 * 1024 * 1024 });
  });
  it('requires an explicit synthetic-only deployment and disables hospital ingestion', () => {
    expect(() => storageSettings({ STORAGE_PROVIDER: 'supabase' })).toThrow('CLOUD_VALIDATION_ONLY');
    expect(() => storageSettings({ STORAGE_PROVIDER: 'supabase', CLOUD_VALIDATION_ONLY: 'true', HL7_ENABLED: 'true' })).toThrow('HL7');
  });
  it('caps the free cloud deployment at 50 MiB and permits lower limits', () => {
    const env = { STORAGE_PROVIDER: 'supabase', CLOUD_VALIDATION_ONLY: 'true' };
    expect(storageSettings(env).maxVideoBytes).toBe(50 * 1024 * 1024);
    expect(storageSettings({ ...env, MAX_VIDEO_MB: '10' }).maxVideoBytes).toBe(10 * 1024 * 1024);
    for (const value of ['51', '0', '-1', '1.5', 'invalid']) {
      expect(() => storageSettings({ ...env, MAX_VIDEO_MB: value })).toThrow('MAX_VIDEO_MB');
    }
    expect(() => storageSettings({ STORAGE_PROVIDER: 'invalid' })).toThrow('STORAGE_PROVIDER');
  });
});
