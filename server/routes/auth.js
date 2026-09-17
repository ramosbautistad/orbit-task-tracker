import { Router } from "express";
import { verifyPassword } from "../lib/password.js";
import { createSessionToken, expiredSessionCookie, hashSessionToken, sessionCookie } from "../lib/session.js";
import { serializeUser } from "../lib/serializers.js";
import { clientError, validateLogin } from "../lib/validation.js";
import { requireUser } from "../middleware/auth.js";

export function createAuthRouter({ repository, config }) {
  const router = Router();

  router.post("/login", async (request, response) => {
    const credentials = validateLogin(request.body);
    const user = await repository.findUserForLogin(credentials.email);
    if (!user || !(await verifyPassword(credentials.password, user.password_hash))) {
      throw clientError("Email or password is incorrect.", 401);
    }

    const token = createSessionToken();
    const maxAgeSeconds = config.sessionTtlDays * 24 * 60 * 60;
    const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
    await repository.createSession({ tokenHash: hashSessionToken(token), userId: user.id, expiresAt });
    response.setHeader("Set-Cookie", sessionCookie(token, { maxAgeSeconds, secure: config.isProduction }));
    response.json({ user: serializeUser(user) });
  });

  router.get("/me", requireUser, (request, response) => {
    response.json({ user: serializeUser(request.user) });
  });

  router.delete("/session", async (request, response) => {
    if (request.sessionTokenHash) await repository.deleteSession(request.sessionTokenHash);
    response.setHeader("Set-Cookie", expiredSessionCookie({ secure: config.isProduction }));
    response.status(204).end();
  });

  return router;
}
