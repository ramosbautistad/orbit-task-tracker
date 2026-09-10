import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authMiddleware } from "./middleware/auth.js";
import { createAuthRouter } from "./routes/auth.js";
import { createWorkspaceRouter } from "./routes/workspace.js";

const buildDirectory = fileURLToPath(new URL("../build", import.meta.url));

export function createApp({ repository, pool, config }) {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "same-origin");
    next();
  });
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/health", async (_request, response) => {
    await pool.query("SELECT 1");
    response.json({ status: "ok" });
  });
  app.use("/api", authMiddleware(repository));
  app.use("/api/auth", createAuthRouter({ repository, config }));
  app.use("/api", createWorkspaceRouter({ repository }));

  app.use(express.static(buildDirectory, { index: "index.html", maxAge: config.isProduction ? "1h" : 0 }));
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api/")) return next();
    response.sendFile(path.join(buildDirectory, "index.html"));
  });

  app.use((request, response) => response.status(404).json({ error: "Not found." }));
  app.use((error, _request, response, _next) => {
    if (error.code === "23505") return response.status(409).json({ error: "That record already exists." });
    if (error.code === "23503" || error.code === "23514") return response.status(400).json({ error: "The submitted data is not valid." });
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    response.status(status).json({ error: status >= 500 ? "Something went wrong." : error.message });
  });

  return app;
}
