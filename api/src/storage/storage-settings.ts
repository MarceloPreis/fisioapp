export function storageSettings(env: NodeJS.ProcessEnv = process.env) {
  const provider = env.STORAGE_PROVIDER || 'minio';
  if (!['minio', 'supabase'].includes(provider)) throw new Error('STORAGE_PROVIDER deve ser minio ou supabase.');
  if (provider === 'supabase' && env.CLOUD_VALIDATION_ONLY !== 'true') {
    throw new Error('Supabase exige CLOUD_VALIDATION_ONLY=true e dados exclusivamente fictícios.');
  }
  if (provider === 'supabase' && env.HL7_ENABLED === 'true') {
    throw new Error('HL7 deve permanecer desativado na validação em nuvem.');
  }
  const maximum = provider === 'supabase' ? 50 : 512;
  const maxVideoMb = Number(env.MAX_VIDEO_MB || maximum);
  if (!Number.isInteger(maxVideoMb) || maxVideoMb < 1 || maxVideoMb > maximum) {
    throw new Error(`MAX_VIDEO_MB deve estar entre 1 e ${maximum}.`);
  }
  return { provider, maxVideoBytes: maxVideoMb * 1024 * 1024 };
}
