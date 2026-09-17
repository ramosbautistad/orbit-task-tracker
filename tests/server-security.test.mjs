import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../server/lib/password.js";
import { createSessionToken, hashSessionToken, readCookie, sessionCookie } from "../server/lib/session.js";
import { validateTaskUpdate } from "../server/lib/validation.js";

test("passwords are salted, hashed, and verified", async () => {
  const first = await hashPassword("a-long-demo-password");
  const second = await hashPassword("a-long-demo-password");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("a-long-demo-password", first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
  assert.equal(first.includes("a-long-demo-password"), false);
});

test("session tokens are random and stored as hashes", () => {
  const token = createSessionToken();
  assert.ok(token.length >= 40);
  assert.match(hashSessionToken(token), /^[a-f0-9]{64}$/);
});

test("session cookie is HttpOnly and readable by the server", () => {
  const cookie = sessionCookie("secret-token", { maxAgeSeconds: 60, secure: true });
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.equal(readCookie(cookie, "orbit_session"), "secret-token");
});

test("employees can update status but not reassign tasks", () => {
  assert.deepEqual(validateTaskUpdate({ status: "done" }, { manager: false }), { status: "done" });
  assert.throws(() => validateTaskUpdate({ assigneeId: "someone" }, { manager: false }), /only change task status/);
});
