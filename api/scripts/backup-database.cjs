// Local encrypted PostgreSQL backup and restore rehearsal in an isolated container.
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomBytes, randomUUID, scryptSync, createCipheriv, createDecipheriv } = require('node:crypto');
const { pipeline } = require('node:stream/promises');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function command(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.resume(); // Never print potentially clinical SQL or credentials.
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(output) : reject(new Error(`Docker ${args[0]} failed (${code}).`)));
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}
async function main() {
  const password = process.env.BACKUP_ENCRYPTION_PASSWORD || process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  if (!password) throw new Error('Configure BACKUP_ENCRYPTION_PASSWORD ou a senha local do PostgreSQL.');
  const container = process.env.BACKUP_DB_CONTAINER || 'fisioappweb-db-1';
  const database = process.env.DB_NAME || process.env.POSTGRES_DB || 'tele_rehab';
  const user = process.env.DB_USER || process.env.POSTGRES_USER || 'admin';
  const dump = spawn('docker', ['exec', container, 'pg_dump', '-U', user, '-d', database, '-Fc'], { windowsHide: true });
  dump.stderr.resume();
  const completion = new Promise((resolve, reject) => {
    dump.on('error', reject);
    dump.on('close', code => code === 0 ? resolve() : reject(new Error('pg_dump failed.')));
  });
  const chunks = [];
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = scryptSync(password, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.on('data', chunk => chunks.push(chunk));
  await Promise.all([pipeline(dump.stdout, cipher), completion]);
  const backup = Buffer.concat([Buffer.from('SITF1'), salt, iv, cipher.getAuthTag(), ...chunks]);
  const directory = path.resolve(__dirname, '../.backups');
  await fs.mkdir(directory, { recursive: true });
  const filename = path.join(directory, `before-multi-tenant-${new Date().toISOString().replaceAll(':', '-')}.pgdump.enc`);
  await fs.writeFile(filename, backup, { flag: 'wx' });
  // Authenticate the saved bytes, then restore only in a container created here.
  const saved = await fs.readFile(filename);
  const decipher = createDecipheriv('aes-256-gcm', scryptSync(password, saved.subarray(5, 21), 32), saved.subarray(21, 33));
  decipher.setAuthTag(saved.subarray(33, 49));
  const plaintext = Buffer.concat([decipher.update(saved.subarray(49)), decipher.final()]);
  const rehearsal = 'sitf-restore-check-' + randomUUID();
  let created = false;
  try {
    await command(['run', '-d', '--name', rehearsal, '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:15-alpine']);
    created = true;
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { await command(['exec', rehearsal, 'pg_isready', '-U', 'postgres']); ready = true; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    if (!ready) throw new Error('Restore container did not become ready.');
    await command(['exec', '-i', rehearsal, 'pg_restore', '-U', 'postgres', '-d', 'postgres', '--no-owner', '--no-privileges', '--exit-on-error'], plaintext);
    console.log('Encrypted local backup saved; full restore rehearsal passed.');
    console.log(filename);
  } finally {
    plaintext.fill(0);
    key.fill(0);
    if (created) await command(['rm', '-f', '-v', rehearsal]);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
