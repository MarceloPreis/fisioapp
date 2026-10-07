import { randomBytes } from 'crypto';
let secret: string | undefined;
export function getJwtSecret(): string {
  if (secret) return secret;
  const configured = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!configured || configured.length < 32)) throw new Error('JWT_SECRET deve conter pelo menos 32 caracteres em produ??o.');
  secret = configured || randomBytes(48).toString('hex');
  return secret;
}
