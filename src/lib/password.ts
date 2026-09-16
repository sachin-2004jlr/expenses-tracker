import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing with Node's built-in scrypt (no native dependency, works on Vercel).
 * Stored format: `scrypt$<salt hex>$<key hex>` so parameters can evolve later.
 */

const scrypt = promisify(scryptCallback) as (password: string, salt: string, keylen: number, options: { N: number; r: number; p: number }) => Promise<Buffer>;

const KEY_LENGTH = 64;
const PARAMS = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, KEY_LENGTH, PARAMS);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algorithm, salt, hex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const key = await scrypt(password, salt, expected.length, PARAMS);
  return key.length === expected.length && timingSafeEqual(key, expected);
}
