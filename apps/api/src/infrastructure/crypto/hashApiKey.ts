import crypto from "node:crypto";

// API keys are 192-bit random tokens. SHA-256 (not bcrypt) is the right tool
// here — uniform high entropy means no value in adaptive cost; we want fast
// constant-time lookups via DB index.
export function hashApiKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}
