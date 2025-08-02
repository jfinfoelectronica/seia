import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY is not set or is not 32 characters long in .env file');
}

const key = Buffer.from(ENCRYPTION_KEY, 'utf-8');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('hex');
}

export function decrypt(encryptedText: string): string {
  try {
    const encryptedBuffer = Buffer.from(encryptedText, 'hex');
    const iv = encryptedBuffer.slice(0, IV_LENGTH);
    const authTag = encryptedBuffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error("Decryption failed:", error);
    // Return an empty string or handle the error as appropriate for your application
    return ""; 
  }
} 