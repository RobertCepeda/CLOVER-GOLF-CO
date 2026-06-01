import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const databaseName = "clover golf";
const adminUrl = process.env.DATABASE_ADMIN_URL || "postgres://postgres:postgres@localhost:5432/postgres";
const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/clover%20golf";

const quoteIdent = (value) => `"${String(value).replaceAll('"', '""')}"`;

const readJson = async (filePath, fallback) => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
};

const { Pool } = await import("pg");

const adminPool = new Pool({ connectionString: adminUrl });

try {
  await adminPool.query(`CREATE DATABASE ${quoteIdent(databaseName)}`);
  console.log(`Created PostgreSQL database: ${databaseName}`);
} catch (error) {
  if (error.code === "42P04") {
    console.log(`PostgreSQL database already exists: ${databaseName}`);
  } else {
    throw error;
  }
} finally {
  await adminPool.end();
}

const pool = new Pool({ connectionString: databaseUrl });
const database = await readJson(join(root, "data", "clover golf.json"), {});
const schema = await readFile(join(root, "database", "schema.sql"), "utf8");

try {
  await pool.query(schema);

  if (database.account) {
    await pool.query(
      `INSERT INTO account (id, email, password, two_factor_enabled, totp_secret, updated_at)
       VALUES (1, $1, $2, $3, $4, $5)
       ON CONFLICT (id)
       DO UPDATE SET
         email = EXCLUDED.email,
         password = EXCLUDED.password,
         two_factor_enabled = EXCLUDED.two_factor_enabled,
         totp_secret = EXCLUDED.totp_secret,
         updated_at = EXCLUDED.updated_at`,
      [
        database.account.email,
        database.account.password,
        database.account.twoFactorEnabled === true,
        database.account.totpSecret || "",
        database.account.updatedAt || new Date().toISOString(),
      ],
    );
  }

  for (const message of database.messages || []) {
    await pool.query(
      `INSERT INTO messages (id, created_at, name, contact, interest, cap_style, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        message.id,
        message.createdAt || new Date().toISOString(),
        message.name,
        message.contact,
        message.interest || "",
        message.capStyle || "",
        message.message,
        message.status || "Nuevo",
      ],
    );
  }

  for (const customer of database.customers || []) {
    await pool.query(
      `INSERT INTO customers (id, name, email, salt, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        customer.id,
        customer.name,
        customer.email,
        customer.salt,
        customer.passwordHash,
        customer.createdAt || new Date().toISOString(),
      ],
    );
  }

  console.log("PostgreSQL schema and seed data are ready.");
} finally {
  await pool.end();
}
