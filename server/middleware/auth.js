import { hashSessionToken, readCookie, sessionCookieName } from "../lib/session.js";
import { clientError } from "../lib/validation.js";

export function authMiddleware(repository) {
  return async (request, _response, next) => {
    const token = readCookie(request.headers.cookie, sessionCookieName);
    request.sessionTokenHash = token ? hashSessionToken(token) : null;
    request.user = request.sessionTokenHash
      ? await repository.findUserBySessionTokenHash(request.sessionTokenHash)
      : null;
    next();
  };
}

export function requireUser(request, _response, next) {
  if (!request.user) return next(clientError("Sign in to continue.", 401));
  next();
}

export function requireManager(request, _response, next) {
  if (!request.user) return next(clientError("Sign in to continue.", 401));
  if (request.user.role !== "manager") return next(clientError("Manager access is required.", 403));
  next();
}
