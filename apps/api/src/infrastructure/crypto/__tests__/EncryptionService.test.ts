import { describe, it, expect } from "vitest";
import { createEncryptionService } from "../EncryptionService.js";
import crypto from "node:crypto";

const TEST_KEY = crypto.randomBytes(32).toString("hex");

describe("EncryptionService", () => {
  it("encrypts and decrypts roundtrip", () => {
    const service = createEncryptionService(TEST_KEY);
    const plaintext = "my-secret-password-123";

    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for same plaintext (unique IV)", () => {
    const service = createEncryptionService(TEST_KEY);
    const plaintext = "same-value";

    const a = service.encrypt(plaintext);
    const b = service.encrypt(plaintext);

    expect(a).not.toBe(b);
  });

  it("handles empty string", () => {
    const service = createEncryptionService(TEST_KEY);

    const encrypted = service.encrypt("");
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe("");
  });

  it("handles unicode", () => {
    const service = createEncryptionService(TEST_KEY);
    const plaintext = "secreto: contraseña 🔐";

    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("fails to decrypt with wrong key", () => {
    const service1 = createEncryptionService(TEST_KEY);
    const service2 = createEncryptionService(crypto.randomBytes(32).toString("hex"));

    const encrypted = service1.encrypt("secret");

    expect(() => service2.decrypt(encrypted)).toThrow();
  });

  it("fails on tampered ciphertext", () => {
    const service = createEncryptionService(TEST_KEY);
    const encrypted = service.encrypt("secret");
    const buf = Buffer.from(encrypted, "base64");
    buf[20] ^= 0xff; // flip a byte in the ciphertext
    const tampered = buf.toString("base64");

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it("rejects key that is not 32 bytes", () => {
    expect(() => createEncryptionService("abcd")).toThrow("32 bytes");
  });
});
