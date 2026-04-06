import crypto from "node:crypto";

export interface EncryptionService {
  encrypt(plaintext: string): string;
  decrypt(encrypted: string): string;
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

class AesGcmEncryptionService implements EncryptionService {
  constructor(private masterKey: Buffer) {}

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, ciphertext, authTag]).toString("base64");
  }

  decrypt(encrypted: string): string {
    const buf = Buffer.from(encrypted, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final("utf8");
  }
}

export function createEncryptionService(keyHex: string): EncryptionService {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)"
    );
  }
  return new AesGcmEncryptionService(key);
}
