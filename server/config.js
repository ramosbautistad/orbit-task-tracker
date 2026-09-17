function readPositiveInteger(name, fallback) {
  const value = Number.parseInt(process.env[name] || String(fallback), 10);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
}

export function getConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required. Copy .env.example to .env for local development or add the variable in Railway.");

  return {
    port: readPositiveInteger("PORT", 4173),
    databaseUrl,
    databaseSsl: process.env.DATABASE_SSL === "true",
    isProduction: process.env.NODE_ENV === "production",
    runMigrations: process.env.RUN_MIGRATIONS === "true",
    sessionTtlDays: readPositiveInteger("SESSION_TTL_DAYS", 7),
  };
}
