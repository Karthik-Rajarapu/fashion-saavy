import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

export type Db = PgliteDatabase;

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../drizzle', import.meta.url));

/**
 * Opens the embedded PostgreSQL engine (PGlite) and applies pending migrations.
 * With `dataDir` the database persists on disk; without it, it lives in memory (tests).
 * A node-postgres driver for a real server replaces this before production (ARCHITECTURE.md §2).
 */
export async function openDatabase(dataDir?: string): Promise<{ db: Db; close: () => Promise<void> }> {
  // PGlite creates its own directory but not missing parents (e.g. a fresh `.data/`).
  if (dataDir) await mkdir(dirname(dataDir), { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle({ client });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return { db, close: () => client.close() };
}

/** Postgres unique-constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: unknown; cause?: { code?: unknown } } | null)?.code ??
    (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  return code === '23505';
}
