import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

function getKey(): Buffer {
  const raw = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!raw) throw new Error("PAYMENT_ENCRYPTION_KEY is not set");
  // Normalize any-length secret to 32 bytes via SHA-256
  return createHash("sha256").update(raw).digest();
}

export function encryptJson(value: unknown): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value ?? null), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptJson<T = unknown>(payload: string | null | undefined): T | null {
  if (!payload) return null;
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  try {
    const key = getKey();
    const iv = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    const data = Buffer.from(parts[3], "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    return null;
  }
}

/** Return a redacted preview like "sk_live_••••1234" so admins can confirm which key is stored. */
export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = String(value);
  if (s.length <= 8) return "•".repeat(Math.max(0, s.length - 2)) + s.slice(-2);
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}
