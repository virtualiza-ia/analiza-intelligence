import { Pool, type PoolConfig } from "pg";

const databaseUrlEnvNames = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;
const discreteDatabaseEnvNames = [
  "PGHOST",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
] as const;

declare global {
  var analizaPgPool: Pool | undefined;
}

export function getDatabaseUrl() {
  for (const envName of databaseUrlEnvNames) {
    const value = process.env[envName]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export function getMissingDatabaseConfig() {
  if (getDatabaseUrl()) {
    return [];
  }

  const missingDiscreteConfig = discreteDatabaseEnvNames.filter(
    (envName) => !process.env[envName]?.trim(),
  );

  return missingDiscreteConfig.length === 0
    ? []
    : ["DATABASE_URL", ...missingDiscreteConfig];
}

function readDiscreteDatabaseConfig(): PoolConfig | null {
  const host = process.env.PGHOST?.trim();
  const user = process.env.PGUSER?.trim();
  const password = process.env.PGPASSWORD?.trim();
  const database = process.env.PGDATABASE?.trim();

  if (!host || !user || !password || !database) {
    return null;
  }

  const port = Number(process.env.PGPORT ?? "5432");

  return {
    database,
    host,
    password,
    port: Number.isInteger(port) && port > 0 ? port : 5432,
    user,
  };
}

export function getPostgresPool() {
  const connectionString = getDatabaseUrl();
  const discreteConfig = readDiscreteDatabaseConfig();

  if (!connectionString && !discreteConfig) {
    throw new Error("PostgreSQL is not configured.");
  }

  if (!globalThis.analizaPgPool) {
    const shouldUseSsl =
      process.env.POSTGRES_SSL === "true" ||
      process.env.DATABASE_SSL === "true" ||
      Boolean(connectionString?.includes("sslmode=require"));

    globalThis.analizaPgPool = new Pool({
      ...(connectionString ? { connectionString } : discreteConfig),
      max: 5,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  return globalThis.analizaPgPool;
}
