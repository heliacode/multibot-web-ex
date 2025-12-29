import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

let ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY is required in production (set a stable 32-byte key).');
  }
  // Dev convenience only: ephemeral key means previously-encrypted values cannot be decrypted after restart.
  console.warn('[ENCRYPTION] ENCRYPTION_KEY not set; generating an ephemeral dev key.');
  ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
}
const ALGORITHM = 'aes-256-cbc';

function getKey() {
  // Preferred: 32-byte key provided as 64 hex characters.
  if (/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  }
  // Fallback: treat as a string and derive a 32-byte buffer.
  return Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf8');
}

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText) {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

