import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt";

export const DEFAULT_PASSWORD = "friend";

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return `${HASH_PREFIX}$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, keyHex] = storedHash.split("$");

  if (prefix !== HASH_PREFIX || !salt || !keyHex) {
    return false;
  }

  const storedKey = Buffer.from(keyHex, "hex");

  if (storedKey.length !== KEY_LENGTH) {
    return false;
  }

  const candidateKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return timingSafeEqual(storedKey, candidateKey);
}
