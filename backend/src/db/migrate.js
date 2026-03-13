import dotenv from "dotenv";
import pg from "pg";
import { runMigrations } from "./runMigrations.js";

dotenv.config({ path: "../.env" });
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || "de_sales",
  password: process.env.POSTGRES_PASSWORD || "de_sales",
  database: process.env.POSTGRES_DB || "job_application"
});

try {
  await runMigrations(pool);
  console.log("Database migrations complete.");
} catch (error) {
  console.error("Database migrations failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
