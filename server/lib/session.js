import { createHash, randomBytes } from "node:crypto";

export const sessionCookieName = "orbit_session";

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function readCookie(header, name) {
  if (!header) return null;
  for (const pair of header.split(";")) {
    const [key, ...value] = pair.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export function sessionCookie(token, { maxAgeSeconds, secure }) {
  const parts = [`${sessionCookieName}=${encodeURIComponent(token)}`, "HttpOnly", "Path=/", "SameSite=Lax", `Max-Age=${maxAgeSeconds}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function expiredSessionCookie({ secure }) {
  return sessionCookie("", { maxAgeSeconds: 0, secure });
}
