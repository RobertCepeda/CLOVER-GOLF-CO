import { createServer } from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";

const root = process.cwd();
const port = 5173;
const host = "127.0.0.1";
const databaseFile = join(root, "data", "clover golf.json");
const messagesFile = join(root, "data", "messages.json");
const accountFile = join(root, "data", "account.json");
const customersFile = join(root, "data", "customers.json");
const defaultAccount = {
  email: "prueba07@gmail.com",
  password: "12345678",
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
  const database = await readDatabase();
  return database.messages;
};

const writeMessages = async (messages) => {
  const database = await readDatabase();
  database.messages = messages;
  await writeDatabase(database);
};

const readCustomers = async () => {
  const database = await readDatabase();
  return database.customers;
};

const writeCustomers = async (customers) => {
  const database = await readDatabase();
  database.customers = customers;
  await writeDatabase(database);
};

const readAccount = async () => {
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

  if (path === "/" || path === "/robert") {
    return "index.html";
  }

  if (path === "/admin" || path === "/robert/admin") {
    return "admin.html";
  }

  if (path.startsWith("/robert/")) {
    return path.slice("/robert/".length);
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
        id: `${Date.now()}-${randomBytes(4).toString("hex")}`,
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

      if (email === account.email.toLowerCase() && password === account.password) {
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

      if (currentPassword !== account.password) {
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

      if (currentPassword !== account.password) {
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

      if (currentPassword !== account.password) {
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
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
  console.log(`- Robert principal: http://localhost:${port}/robert`);
  console.log(`- Robert admin: http://localhost:${port}/robert/admin`);
});
