import { createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const databaseName = "clover golf";
const appRoleName = "clover_app";
const adminUrl = process.env.DATABASE_ADMIN_URL;
const databaseUrl = process.env.DATABASE_URL;
const appRolePassword = process.env.CLOVER_APP_DB_PASSWORD || "";

if (!adminUrl || !databaseUrl) {
  throw new Error(
    "Define DATABASE_ADMIN_URL y DATABASE_URL antes de inicializar PostgreSQL. Revisa .env.example.",
  );
}

const products = [
  {
    slug: "signature-leather",
    name: "Signature Leather",
    categorySlug: "gorras",
    tags: ["cuero", "bordado", "clasica"],
    imageUrl: "assets/cap-thumb-signature-leather.png?v=5",
    view360Url: "assets/cap-360-signature-leather-production.png?v=2",
    description: "Crema, verde bosque y parche de cuero grabado para el modelo principal.",
  },
  {
    slug: "forest-classic",
    name: "Forest Classic",
    categorySlug: "gorras",
    tags: ["bordado", "verde", "clasica"],
    imageUrl: "assets/cap-thumb-forest-classic.png?v=5",
    view360Url: "assets/cap-360-forest-classic-production.png?v=2",
    description: "Gorra verde completa con bordado crema, textura de tela y perfil limpio.",
  },
  {
    slug: "stripe-course",
    name: "Stripe Course",
    categorySlug: "gorras",
    tags: ["bordado", "rayas", "retro"],
    imageUrl: "assets/cap-thumb-stripe-course.png?v=5",
    view360Url: "assets/cap-360-stripe-course-production.png?v=2",
    description: "Rayas verticales crema y verde con presencia retro de campo.",
  },
  {
    slug: "cream-heritage",
    name: "Cream Heritage",
    categorySlug: "gorras",
    tags: ["bordado", "crema", "clasica"],
    imageUrl: "assets/cap-thumb-cream-heritage.png?v=5",
    view360Url: "assets/cap-360-cream-heritage-production.png?v=2",
    description: "Base crema limpia con logo Clover bordado al frente.",
  },
  {
    slug: "olive-performance",
    name: "Olive Performance",
    categorySlug: "gorras",
    tags: ["performance", "oliva", "perforada"],
    imageUrl: "assets/cap-thumb-olive-performance.png?v=5",
    view360Url: "assets/cap-360-olive-performance-production.png?v=2",
    description: "Oliva sobrio, textura ligera y perforaciones laterales.",
  },
  {
    slug: "tour-cream",
    name: "Tour Cream",
    categorySlug: "gorras",
    tags: ["bordado", "crema", "verde"],
    imageUrl: "assets/cap-thumb-tour-cream.png?v=5",
    view360Url: "assets/cap-360-tour-cream-production.png?v=2",
    description: "Crema con visera verde y logo centrado sin cordon frontal.",
  },
  {
    slug: "womens-bucket",
    name: "Women's Bucket Hat",
    categorySlug: "mujer",
    tags: ["mujer", "bucket", "bordado"],
    imageUrl: "assets/cap-thumb-womens-bucket.png?v=5",
    view360Url: "assets/cap-360-womens-bucket-production.png?v=2",
    description: "Bucket hat crema con textura sutil y logo Clover bordado al frente.",
  },
  {
    slug: "jiuguva-visor",
    name: "Jiuguva Visor",
    categorySlug: "mujer",
    tags: ["mujer", "visor", "performance"],
    imageUrl: "assets/cap-thumb-jiuguva-visor.png?v=5",
    view360Url: "assets/cap-360-jiuguva-visor-production.png?v=4",
    description: "Visor blanco con banda respirable y logo bordado centrado arriba.",
  },
  {
    slug: "fairway-classic",
    name: "Fairway Classic",
    categorySlug: "mujer",
    tags: ["mujer", "bordado", "verde"],
    imageUrl: "assets/cap-thumb-fairway-classic.png?v=5",
    view360Url: "assets/cap-360-fairway-classic-production.png?v=2",
    description: "Gorra femenina en verde profundo con logo Clover crema bordado.",
  },
  {
    slug: "cream-fairway",
    name: "Cream Fairway",
    categorySlug: "mujer",
    tags: ["mujer", "crema", "verde"],
    imageUrl: "assets/cap-thumb-cream-fairway.png?v=5",
    view360Url: "assets/cap-360-cream-fairway-production.png?v=2",
    description: "Base crema con visera verde para un look femenino de campo.",
  },
];

const quoteIdent = (value) => `"${String(value).replaceAll('"', '""')}"`;
const quoteLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;

const readJson = async (filePath, fallback) => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
};

const hashPassword = (password, salt) => createHmac("sha256", salt).update(password).digest("hex");

const generateUuidV7 = () => {
  const bytes = randomBytes(16);
  let timestamp = BigInt(Date.now());

  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(timestamp & 0xffn);
    timestamp >>= 8n;
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
};

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );

const getPersistableId = (value) => (isUuid(value) ? value : generateUuidV7());

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
  await pool.query("BEGIN");

  const account = database.account || {};
  const adminEmail = process.env.CLOVER_ADMIN_EMAIL || account.email;
  const adminPassword = process.env.CLOVER_ADMIN_PASSWORD || account.password;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Define CLOVER_ADMIN_EMAIL y CLOVER_ADMIN_PASSWORD, o conserva una cuenta admin en data/clover golf.json.",
    );
  }

  const adminSalt = randomBytes(16).toString("hex");

  await pool.query(
    `INSERT INTO users (full_name, email, password_salt, password_hash, is_admin, two_factor_enabled, totp_secret, updated_at)
     VALUES ($1, $2, $3, $4, true, $5, $6, $7)
     ON CONFLICT (email_normalized)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password_salt = EXCLUDED.password_salt,
       password_hash = EXCLUDED.password_hash,
       is_admin = true,
       two_factor_enabled = EXCLUDED.two_factor_enabled,
       totp_secret = EXCLUDED.totp_secret,
      updated_at = EXCLUDED.updated_at`,
    [
      "Admin Clover",
      adminEmail,
      adminSalt,
      hashPassword(adminPassword, adminSalt),
      account.twoFactorEnabled === true,
      account.totpSecret || "",
      account.updatedAt || new Date().toISOString(),
    ],
  );

  for (const category of [
    ["gorras", "Gorras", 1],
    ["mujer", "Linea mujer", 2],
  ]) {
    await pool.query(
      `INSERT INTO product_categories (slug, name, display_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug)
       DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order`,
      category,
    );
  }

  const allTags = [...new Set(products.flatMap((product) => product.tags))];
  for (const tag of allTags) {
    await pool.query(
      `INSERT INTO product_tags (slug, name)
       VALUES ($1, $2)
       ON CONFLICT (slug)
       DO UPDATE SET name = EXCLUDED.name`,
      [tag, tag.replaceAll("-", " ")],
    );
  }

  for (const product of products) {
    const productResult = await pool.query(
      `WITH category AS (
         SELECT category_id FROM product_categories WHERE slug = $1
       )
       INSERT INTO products (category_id, slug, name, description)
       SELECT category_id, $2, $3, $4 FROM category
       ON CONFLICT (slug)
       DO UPDATE SET
         category_id = EXCLUDED.category_id,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         updated_at = now()
       RETURNING product_id`,
      [product.categorySlug, product.slug, product.name, product.description],
    );
    const productId = productResult.rows[0].product_id;

    for (const [imageKind, imageUrl, displayOrder, isPrimary] of [
      ["thumbnail", product.imageUrl, 1, true],
      ["view_360", product.view360Url, 2, false],
    ]) {
      await pool.query(
        `INSERT INTO product_images (product_id, image_kind, image_url, alt_text, display_order, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [productId, imageKind, imageUrl, `Gorra ${product.name} Clover Golf Co.`, displayOrder, isPrimary],
      );
    }

    for (const tag of product.tags) {
      await pool.query(
        `WITH tag_row AS (
           SELECT product_tag_id FROM product_tags WHERE slug = $2
         )
         INSERT INTO product_tag_assignments (product_id, product_tag_id)
         SELECT $1, product_tag_id FROM tag_row
         ON CONFLICT DO NOTHING`,
        [productId, tag],
      );
    }
  }

  for (const customer of database.customers || []) {
    await pool.query(
      `INSERT INTO users (user_id, full_name, email, password_salt, password_hash, is_admin, created_at)
       VALUES ($1, $2, $3, $4, $5, false, $6)
       ON CONFLICT (email_normalized) DO NOTHING`,
      [
        getPersistableId(customer.id),
        customer.name,
        customer.email,
        customer.salt,
        customer.passwordHash,
        customer.createdAt || new Date().toISOString(),
      ],
    );
  }

  for (const message of database.messages || []) {
    const productResult = await pool.query("SELECT product_id FROM products WHERE name = $1", [
      message.capStyle || "",
    ]);

    await pool.query(
      `INSERT INTO inquiries (inquiry_id, created_at, name, contact, interest, selected_product_id, cap_style, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (inquiry_id) DO NOTHING`,
      [
        getPersistableId(message.id),
        message.createdAt || new Date().toISOString(),
        message.name,
        message.contact,
        message.interest || "Consulta",
        productResult.rows[0]?.product_id || null,
        message.capStyle || null,
        message.message,
        message.status || "Nuevo",
      ],
    );
  }

  if (appRolePassword) {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${quoteLiteral(appRoleName)}) THEN
          CREATE ROLE ${quoteIdent(appRoleName)} LOGIN PASSWORD ${quoteLiteral(appRolePassword)};
        END IF;
      END
      $$;
    `);
    await pool.query(`GRANT CONNECT ON DATABASE ${quoteIdent(databaseName)} TO ${quoteIdent(appRoleName)}`);
    await pool.query(`GRANT USAGE ON SCHEMA public TO ${quoteIdent(appRoleName)}`);
    await pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quoteIdent(appRoleName)}`,
    );
    await pool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quoteIdent(
        appRoleName,
      )}`,
    );

    for (const table of ["users", "carts", "cart_items", "favorites", "inquiries"]) {
      const policy = `${table}_clover_app_access`;

      await pool.query(`DROP POLICY IF EXISTS ${quoteIdent(policy)} ON ${quoteIdent(table)}`);
      await pool.query(
        `CREATE POLICY ${quoteIdent(policy)}
         ON ${quoteIdent(table)}
         FOR ALL
         TO ${quoteIdent(appRoleName)}
         USING (true)
         WITH CHECK (true)`,
      );
    }
  }

  await pool.query("COMMIT");
  console.log("PostgreSQL schema and seed data are ready.");
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
