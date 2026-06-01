import { createServer } from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";

const root = process.cwd();
const port = 5173;
const host = "localhost";
const databaseUrl = process.env.DATABASE_URL || "";
const databaseFile = join(root, "data", "clover golf.json");
const messagesFile = join(root, "data", "messages.json");
const accountFile = join(root, "data", "account.json");
const customersFile = join(root, "data", "customers.json");
const defaultAccount = {
  email: process.env.CLOVER_ADMIN_EMAIL || "admin@clover.local",
  password: process.env.CLOVER_ADMIN_PASSWORD || "",
  twoFactorEnabled: false,
  totpSecret: "",
};
const totpIssuer = "Clover Golf Co.";
const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
};

let pgPoolPromise;

const getPostgresPool = async () => {
  if (!databaseUrl) {
    return null;
  }

  if (!pgPoolPromise) {
    pgPoolPromise = import("pg")
      .then(({ Pool }) => new Pool({ connectionString: databaseUrl }))
      .catch((error) => {
        console.warn(`PostgreSQL driver unavailable, using JSON fallback: ${error.message}`);
        return null;
      });
  }

  return pgPoolPromise;
};

const ensurePostgres = async () => {
  const pool = await getPostgresPool();

  if (!pool) {
    return null;
  }

  try {
    await pool.query("SELECT 1");
  } catch (error) {
    console.warn(`PostgreSQL unavailable, using JSON fallback: ${error.message}`);
    return null;
  }

  return pool;
};

const readJsonFile = async (filePath, fallback) => {
  try {
    const file = await readFile(filePath, "utf8");
    return JSON.parse(file);
  } catch {
    return fallback;
  }
};

const writeDatabase = async (database) => {
  await mkdir(dirname(databaseFile), { recursive: true });
  await writeFile(
    databaseFile,
    JSON.stringify(
      {
        name: "clover golf",
        version: 1,
        createdAt: database.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        account: database.account || defaultAccount,
        messages: Array.isArray(database.messages) ? database.messages : [],
        customers: Array.isArray(database.customers) ? database.customers : [],
      },
      null,
      2,
    ),
  );
};

const readDatabase = async () => {
  const database = await readJsonFile(databaseFile, null);

  if (database && typeof database === "object") {
    return {
      name: "clover golf",
      version: 1,
      createdAt: cleanText(database.createdAt, 80) || new Date().toISOString(),
      updatedAt: cleanText(database.updatedAt, 80),
      account: database.account || defaultAccount,
      messages: Array.isArray(database.messages) ? database.messages : [],
      customers: Array.isArray(database.customers) ? database.customers : [],
    };
  }

  const legacyMessages = await readJsonFile(messagesFile, []);
  const legacyCustomers = await readJsonFile(customersFile, []);
  const legacyAccount = await readJsonFile(accountFile, defaultAccount);
  const nextDatabase = {
    name: "clover golf",
    version: 1,
    createdAt: new Date().toISOString(),
    account: legacyAccount || defaultAccount,
    messages: Array.isArray(legacyMessages) ? legacyMessages : [],
    customers: Array.isArray(legacyCustomers) ? legacyCustomers : [],
  };

  await writeDatabase(nextDatabase);
  return nextDatabase;
};

const readMessages = async () => {
  const pool = await ensurePostgres();

  if (pool) {
    const result = await pool.query(
      `SELECT inquiry_id, created_at, name, contact, interest, cap_style, message, status
       FROM inquiries
       ORDER BY created_at DESC`,
    );

    return result.rows.map((row) => ({
      id: row.inquiry_id,
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      name: row.name,
      contact: row.contact,
      interest: row.interest,
      capStyle: row.cap_style,
      message: row.message,
      status: row.status,
    }));
  }

  const database = await readDatabase();
  return database.messages;
};

const writeMessages = async (messages) => {
  const pool = await ensurePostgres();

  if (pool) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM inquiries");

      for (const message of messages) {
        await client.query(
          `INSERT INTO inquiries (inquiry_id, created_at, name, contact, interest, cap_style, message, status)
           VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)`,
          [
            getPersistableId(message.id),
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

      await client.query("COMMIT");
      return;
    } catch (error) {
      await client.query("ROLLBACK");
      console.warn(`Could not write PostgreSQL messages, using JSON fallback: ${error.message}`);
    } finally {
      client.release();
    }
  }

  const database = await readDatabase();
  database.messages = messages;
  await writeDatabase(database);
};

const readCustomers = async () => {
  const pool = await ensurePostgres();

  if (pool) {
    const result = await pool.query(
      `SELECT user_id, full_name, email, password_salt, password_hash, created_at
       FROM users
       WHERE is_admin = false
       ORDER BY created_at DESC`,
    );

    return result.rows.map((row) => ({
      id: row.user_id,
      name: row.full_name,
      email: row.email,
      salt: row.password_salt,
      passwordHash: row.password_hash,
      createdAt: row.created_at?.toISOString?.() || row.created_at,
    }));
  }

  const database = await readDatabase();
  return database.customers;
};

const writeCustomers = async (customers) => {
  const pool = await ensurePostgres();

  if (pool) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM users WHERE is_admin = false");

      for (const customer of customers) {
        await client.query(
          `INSERT INTO users (user_id, full_name, email, password_salt, password_hash, is_admin, created_at)
           VALUES ($1::uuid, $2, $3, $4, $5, false, $6)
           ON CONFLICT (email_normalized)
           DO UPDATE SET
             full_name = EXCLUDED.full_name,
             password_salt = EXCLUDED.password_salt,
             password_hash = EXCLUDED.password_hash,
             updated_at = now()`,
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

      await client.query("COMMIT");
      return;
    } catch (error) {
      await client.query("ROLLBACK");
      console.warn(`Could not write PostgreSQL customers, using JSON fallback: ${error.message}`);
    } finally {
      client.release();
    }
  }

  const database = await readDatabase();
  database.customers = customers;
  await writeDatabase(database);
};

const readAccount = async () => {
  const pool = await ensurePostgres();

  if (pool) {
    const result = await pool.query(
      `SELECT email, password_salt, password_hash, two_factor_enabled, totp_secret, updated_at
       FROM users
       WHERE is_admin = true
       ORDER BY created_at
       LIMIT 1`,
    );
    const row = result.rows[0];

    if (row) {
      const totpSecret = cleanText(row.totp_secret, 80).replace(/\s+/g, "").toUpperCase();

      return {
        email: cleanText(row.email, 120) || defaultAccount.email,
        salt: row.password_salt,
        passwordHash: row.password_hash,
        twoFactorEnabled: row.two_factor_enabled === true && Boolean(totpSecret),
        totpSecret,
        updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
      };
    }
  }

  const database = await readDatabase();
  const account = database.account || defaultAccount;
  const totpSecret = cleanText(account.totpSecret, 80).replace(/\s+/g, "").toUpperCase();

  return {
    email: cleanText(account.email, 120) || defaultAccount.email,
    password: cleanText(account.password, 120) || defaultAccount.password,
    twoFactorEnabled: account.twoFactorEnabled === true && Boolean(totpSecret),
    totpSecret,
    updatedAt: cleanText(account.updatedAt, 80),
  };
};

const writeAccount = async (account) => {
  const pool = await ensurePostgres();

  if (pool) {
    const salt = account.salt || randomBytes(16).toString("hex");
    const passwordHash = account.passwordHash || hashCustomerPassword(account.password, salt);

    await pool.query(
      `INSERT INTO users (full_name, email, password_salt, password_hash, is_admin, two_factor_enabled, totp_secret, updated_at)
       VALUES ('Admin Clover', $1, $2, $3, true, $4, $5, $6)
       ON CONFLICT (email_normalized)
       DO UPDATE SET
         email = EXCLUDED.email,
         password_salt = EXCLUDED.password_salt,
         password_hash = EXCLUDED.password_hash,
         is_admin = true,
         two_factor_enabled = EXCLUDED.two_factor_enabled,
         totp_secret = EXCLUDED.totp_secret,
         updated_at = EXCLUDED.updated_at`,
      [
        account.email,
        salt,
        passwordHash,
        account.twoFactorEnabled === true,
        account.totpSecret || "",
        account.updatedAt || new Date().toISOString(),
      ],
    );
    return;
  }

  const database = await readDatabase();
  database.account = account;
  await writeDatabase(database);
};

const readRequestJson = async (request) => {
  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (body.length > 20000) {
      throw new Error("Request body too large");
    }
  }

  return JSON.parse(body || "{}");
};

const cleanText = (value, maxLength) =>
  String(value ?? "")
    .trim()
    .slice(0, maxLength);

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const hashCustomerPassword = (password, salt) =>
  createHmac("sha256", salt).update(password).digest("hex");

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

const verifyAccountPassword = (account, password) => {
  if (account.passwordHash && account.salt) {
    return hashCustomerPassword(password, account.salt) === account.passwordHash;
  }

  return password === account.password;
};

const generateBase32Secret = () => {
  const bytes = randomBytes(20);
  let bits = "";
  let secret = "";

  bytes.forEach((byte) => {
    bits += byte.toString(2).padStart(8, "0");
  });

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    secret += base32Alphabet[parseInt(chunk, 2)];
  }

  return secret;
};

const formatSecret = (secret) => secret.match(/.{1,4}/g)?.join(" ") ?? secret;

const normalizeSecret = (secret) =>
  cleanText(secret, 120)
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "");

const decodeBase32 = (secret) => {
  let bits = "";

  normalizeSecret(secret)
    .split("")
    .forEach((char) => {
      const value = base32Alphabet.indexOf(char);

      if (value >= 0) {
        bits += value.toString(2).padStart(5, "0");
      }
    });

  const bytes = [];

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
};

const generateTotp = (secret, step = Math.floor(Date.now() / 30000)) => {
  const key = decodeBase32(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));

  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1000000).padStart(6, "0");
};

const safeTextEqual = (first, second) => {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  return (
    firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer)
  );
};

const verifyTotp = (secret, token) => {
  const cleanToken = cleanText(token, 12).replace(/\D/g, "");

  if (!/^\d{6}$/.test(cleanToken) || !secret) {
    return false;
  }

  const currentStep = Math.floor(Date.now() / 30000);

  for (let offset = -1; offset <= 1; offset += 1) {
    if (safeTextEqual(generateTotp(secret, currentStep + offset), cleanToken)) {
      return true;
    }
  }

  return false;
};

const buildOtpAuthUrl = (email, secret) => {
  const label = `${totpIssuer}:${email}`;
  const params = new URLSearchParams({
    secret,
    issuer: totpIssuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
};

const resolveRoute = (cleanPath) => {
  const path = cleanPath.replace(/\\/g, "/");

  if (path === "/") {
    return "index.html";
  }

  if (path === "/admin") {
    return "admin.html";
  }

  return path.replace(/^\/+/, "");
};

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${host}:${port}`);
  const cleanPath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");

  if (url.pathname === "/api/customers" && request.method === "POST") {
    try {
      const payload = await readRequestJson(request);
      const name = cleanText(payload.name, 80);
      const email = cleanText(payload.email, 120).toLowerCase();
      const password = cleanText(payload.password, 120);

      if (!name || !isValidEmail(email) || password.length < 6) {
        sendJson(response, 400, { error: "Completa nombre, correo y password de al menos 6 caracteres." });
        return;
      }

      const customers = await readCustomers();
      const existingCustomer = customers.find((customer) => customer.email === email);

      if (existingCustomer) {
        const passwordHash = hashCustomerPassword(password, existingCustomer.salt);

        if (passwordHash !== existingCustomer.passwordHash) {
          sendJson(response, 409, { error: "Esa cuenta ya existe. Revisa el password." });
          return;
        }

        sendJson(response, 200, {
          id: existingCustomer.id,
          name: existingCustomer.name,
          email: existingCustomer.email,
          createdAt: existingCustomer.createdAt,
        });
        return;
      }

      const salt = randomBytes(16).toString("hex");
      const nextCustomer = {
        id: generateUuidV7(),
        name,
        email,
        salt,
        passwordHash: hashCustomerPassword(password, salt),
        createdAt: new Date().toISOString(),
      };

      customers.unshift(nextCustomer);
      await writeCustomers(customers.slice(0, 1000));
      sendJson(response, 201, {
        id: nextCustomer.id,
        name: nextCustomer.name,
        email: nextCustomer.email,
        createdAt: nextCustomer.createdAt,
      });
    } catch {
      sendJson(response, 400, { error: "No se pudo crear o abrir la cuenta." });
    }

    return;
  }

  if (url.pathname === "/api/login" && request.method === "POST") {
    try {
      const payload = await readRequestJson(request);
      const account = await readAccount();
      const email = cleanText(payload.email, 120).toLowerCase();
      const password = cleanText(payload.password, 120);
      const twoFactorCode = cleanText(payload.twoFactorCode, 12);

      if (email === account.email.toLowerCase() && verifyAccountPassword(account, password)) {
        if (account.twoFactorEnabled) {
          if (!twoFactorCode) {
            sendJson(response, 202, {
              email: account.email,
              requiresTwoFactor: true,
              twoFactorEnabled: true,
            });
            return;
          }

          if (!verifyTotp(account.totpSecret, twoFactorCode)) {
            sendJson(response, 401, { error: "Codigo 2FA incorrecto o vencido." });
            return;
          }
        }

        sendJson(response, 200, {
          email: account.email,
          requiresTwoFactor: false,
          twoFactorEnabled: account.twoFactorEnabled,
        });
        return;
      }

      sendJson(response, 401, { error: "Credenciales incorrectas." });
    } catch {
      sendJson(response, 400, { error: "No se pudo iniciar sesion." });
    }

    return;
  }

  if (url.pathname === "/api/account" && request.method === "GET") {
    const account = await readAccount();
    sendJson(response, 200, {
      email: account.email,
      twoFactorEnabled: account.twoFactorEnabled,
    });
    return;
  }

  if (url.pathname === "/api/2fa/setup" && request.method === "POST") {
    try {
      const payload = await readRequestJson(request);
      const account = await readAccount();
      const currentPassword = cleanText(payload.currentPassword, 120);

      if (!verifyAccountPassword(account, currentPassword)) {
        sendJson(response, 403, { error: "La contrasena actual no coincide." });
        return;
      }

      const secret = generateBase32Secret();

      sendJson(response, 200, {
        secret,
        secretDisplay: formatSecret(secret),
        otpauthUrl: buildOtpAuthUrl(account.email, secret),
        issuer: totpIssuer,
        accountName: account.email,
        period: 30,
      });
    } catch {
      sendJson(response, 400, { error: "No se pudo generar la clave 2FA." });
    }

    return;
  }

  if (url.pathname === "/api/2fa/enable" && request.method === "POST") {
    try {
      const payload = await readRequestJson(request);
      const account = await readAccount();
      const currentPassword = cleanText(payload.currentPassword, 120);
      const secret = normalizeSecret(payload.secret);
      const twoFactorCode = cleanText(payload.twoFactorCode, 12);

      if (!verifyAccountPassword(account, currentPassword)) {
        sendJson(response, 403, { error: "La contrasena actual no coincide." });
        return;
      }

      if (secret.length < 16 || !verifyTotp(secret, twoFactorCode)) {
        sendJson(response, 400, { error: "Codigo 2FA incorrecto o vencido." });
        return;
      }

      const nextAccount = {
        ...account,
        twoFactorEnabled: true,
        totpSecret: secret,
        updatedAt: new Date().toISOString(),
      };

      await writeAccount(nextAccount);
      sendJson(response, 200, { email: nextAccount.email, twoFactorEnabled: true });
    } catch {
      sendJson(response, 400, { error: "No se pudo activar 2FA." });
    }

    return;
  }

  if (url.pathname === "/api/2fa/verify" && request.method === "POST") {
    try {
      const payload = await readRequestJson(request);
      const account = await readAccount();

      if (!account.twoFactorEnabled) {
        sendJson(response, 200, { verified: true, twoFactorEnabled: false });
        return;
      }

      if (!verifyTotp(account.totpSecret, payload.twoFactorCode)) {
        sendJson(response, 401, { error: "Codigo 2FA incorrecto o vencido." });
        return;
      }

      sendJson(response, 200, { verified: true, twoFactorEnabled: true });
    } catch {
      sendJson(response, 400, { error: "No se pudo verificar 2FA." });
    }

    return;
  }

  if (url.pathname === "/api/account" && request.method === "PUT") {
    try {
      const payload = await readRequestJson(request);
      const account = await readAccount();
      const email = cleanText(payload.email, 120).toLowerCase();
      const currentPassword = cleanText(payload.currentPassword, 120);
      const newPassword = cleanText(payload.newPassword, 120);
      const twoFactorCode = cleanText(payload.twoFactorCode, 12);

      if (!verifyAccountPassword(account, currentPassword)) {
        sendJson(response, 403, { error: "La contrasena actual no coincide." });
        return;
      }

      if (account.twoFactorEnabled && !verifyTotp(account.totpSecret, twoFactorCode)) {
        sendJson(response, 403, { error: "Codigo 2FA incorrecto o vencido." });
        return;
      }

      if (!isValidEmail(email)) {
        sendJson(response, 400, { error: "Ingresa un correo valido." });
        return;
      }

      if (newPassword && newPassword.length < 8) {
        sendJson(response, 400, { error: "La nueva contrasena debe tener al menos 8 caracteres." });
        return;
      }

      const nextAccount = {
        ...account,
        email,
        password: newPassword || account.password,
        salt: newPassword ? "" : account.salt,
        passwordHash: newPassword ? "" : account.passwordHash,
        updatedAt: new Date().toISOString(),
      };

      await writeAccount(nextAccount);
      sendJson(response, 200, { email: nextAccount.email });
    } catch {
      sendJson(response, 400, { error: "No se pudo actualizar la cuenta." });
    }

    return;
  }

  if (url.pathname === "/api/messages" && request.method === "GET") {
    const messages = await readMessages();
    sendJson(response, 200, messages);
    return;
  }

  if (url.pathname === "/api/messages" && request.method === "POST") {
    try {
      const payload = await readRequestJson(request);
      const name = cleanText(payload.name, 80);
      const contact = cleanText(payload.contact, 120);
      const interest = cleanText(payload.interest, 80);
      const capStyle = cleanText(payload.capStyle, 80);
      const message = cleanText(payload.message, 1000);

      if (!name || !contact || !message) {
        sendJson(response, 400, { error: "Faltan datos requeridos." });
        return;
      }

      const messages = await readMessages();
      const nextMessage = {
        id: generateUuidV7(),
        createdAt: new Date().toISOString(),
        name,
        contact,
        interest,
        capStyle,
        message,
        status: "Nuevo",
      };

      messages.unshift(nextMessage);
      await writeMessages(messages.slice(0, 200));
      sendJson(response, 201, nextMessage);
    } catch {
      sendJson(response, 400, { error: "No se pudo guardar el mensaje." });
    }

    return;
  }

  const routePath = resolveRoute(cleanPath);
  const filePath = join(root, routePath);

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
    });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, host, () => {
  console.log("Clover Golf Co. running at:");
  console.log(`- Principal: http://${host}:${port}`);
  console.log(`- Admin: http://${host}:${port}/admin`);
});
