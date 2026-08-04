import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  var analizaDatabasePool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for server-side data access.");
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

export function getDatabasePool() {
  if (!globalThis.analizaDatabasePool) {
    globalThis.analizaDatabasePool = createPool();
  }

  return globalThis.analizaDatabasePool;
}

export async function queryDatabase<Row extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
) {
  return getDatabasePool().query<Row>(text, [...values]);
}

export async function withDatabaseTransaction<Result>(
  operation: (client: PoolClient) => Promise<Result>,
) {
  const client = await getDatabasePool().connect();

  try {
    await client.query("begin");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error: unknown) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
