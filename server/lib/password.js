import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;
const parameters = { N: 16_384, r: 8, p: 1 };

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 10) {
    throw new Error("Passwords must contain at least 10 characters.");
  }
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, keyLength, parameters);
  return `scrypt$${parameters.N}$${parameters.r}$${parameters.p}$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password, encodedHash) {
  try {
    const [algorithm, n, r, p, saltValue, hashValue] = encodedHash.split("$");
    if (algorithm !== "scrypt") return false;
    const expected = Buffer.from(hashValue, "base64url");
    const actual = await scrypt(password, Buffer.from(saltValue, "base64url"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch (_) {
    return false;
  }
}
