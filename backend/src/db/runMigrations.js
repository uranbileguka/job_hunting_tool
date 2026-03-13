import { migrations } from "./migrations.js";

export async function runMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const migration of migrations) {
    const existsResult = await pool.query("SELECT 1 FROM schema_migrations WHERE id = $1", [
      migration.id
    ]);
    if (existsResult.rowCount > 0) {
      continue;
    }

    await pool.query("BEGIN");
    try {
      await pool.query(migration.sql);
      await pool.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migration.id]);
      await pool.query("COMMIT");
      console.log(`Applied migration: ${migration.id}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
}
