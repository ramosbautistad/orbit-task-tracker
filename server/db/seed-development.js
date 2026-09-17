import { fileURLToPath } from "node:url";
import { getConfig } from "../config.js";
import { createPool } from "./pool.js";
import { hashPassword } from "../lib/password.js";

export async function seedDevelopment(pool, values = process.env) {
  const organizationName = values.ORBIT_BOOTSTRAP_ORGANIZATION || "Brightside Studio";
  const organizationSlug = values.ORBIT_BOOTSTRAP_SLUG || "brightside-studio";
  const managerName = values.ORBIT_BOOTSTRAP_MANAGER_NAME;
  const managerEmail = values.ORBIT_BOOTSTRAP_MANAGER_EMAIL?.toLowerCase();
  const managerPassword = values.ORBIT_BOOTSTRAP_MANAGER_PASSWORD;
  if (!managerName || !managerEmail || !managerPassword) {
    throw new Error("Set ORBIT_BOOTSTRAP_MANAGER_NAME, ORBIT_BOOTSTRAP_MANAGER_EMAIL, and ORBIT_BOOTSTRAP_MANAGER_PASSWORD before seeding.");
  }

  const passwordHash = await hashPassword(managerPassword);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const organizationResult = await client.query(
      `INSERT INTO organizations (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [organizationName, organizationSlug]
    );
    const organizationId = organizationResult.rows[0].id;

    for (const name of ["Design", "Marketing", "Operations"]) {
      await client.query(
        `INSERT INTO teams (organization_id, name)
         SELECT $1, $2
         WHERE NOT EXISTS (
           SELECT 1 FROM teams WHERE organization_id = $1 AND lower(name) = lower($2)
         )`,
        [organizationId, name]
      );
    }

    const teamResult = await client.query(
      "SELECT id FROM teams WHERE organization_id = $1 AND lower(name) = 'operations'",
      [organizationId]
    );
    await client.query(
      `INSERT INTO users (organization_id, team_id, name, email, role, password_hash)
       SELECT $1, $2, $3, $4, 'manager', $5
       WHERE NOT EXISTS (
         SELECT 1 FROM users WHERE organization_id = $1 AND lower(email) = lower($4)
       )`,
      [organizationId, teamResult.rows[0].id, managerName, managerEmail, passwordHash]
    );
    await client.query("COMMIT");
    console.log(`Development workspace is ready for ${managerEmail}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pool = createPool(getConfig());
  seedDevelopment(pool).finally(() => pool.end());
}
