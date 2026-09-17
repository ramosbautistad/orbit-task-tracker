import { getConfig } from "./config.js";
import { createPool } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";
import { WorkspaceRepository } from "./repositories/workspace-repository.js";
import { createApp } from "./app.js";

const config = getConfig();
const pool = createPool(config);

if (config.runMigrations) await runMigrations(pool);

const repository = new WorkspaceRepository(pool);
const app = createApp({ repository, pool, config });
const server = app.listen(config.port, () => console.log(`Orbit is running on port ${config.port}`));

async function shutDown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutDown("SIGTERM"));
process.on("SIGINT", () => shutDown("SIGINT"));
