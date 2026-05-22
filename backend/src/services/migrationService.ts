import postgres from './postgresService.js';

export interface Migration {
  name: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

let migrationTableReady = false;

export async function ensureMigrationTable() {
  if (migrationTableReady) return;

  await postgres.query(`
    CREATE TABLE IF NOT EXISTS rna_migrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  migrationTableReady = true;
}

export async function recordMigration(name: string) {
  await ensureMigrationTable();
  await postgres.query(`INSERT INTO rna_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name]);
}

export async function isMigrationExecuted(name: string): Promise<boolean> {
  await ensureMigrationTable();
  const result = await postgres.query(`SELECT 1 FROM rna_migrations WHERE name = $1`, [name]);
  return result.rows.length > 0;
}

export async function runMigration(migration: Migration) {
  const isExecuted = await isMigrationExecuted(migration.name);
  if (isExecuted) {
    console.log(`Migration already executed: ${migration.name}`);
    return;
  }

  console.log(`Running migration: ${migration.name}`);
  await migration.up();
  await recordMigration(migration.name);
  console.log(`Migration completed: ${migration.name}`);
}

export async function runMigrations(migrations: Migration[]) {
  for (const migration of migrations) {
    await runMigration(migration);
  }
}
