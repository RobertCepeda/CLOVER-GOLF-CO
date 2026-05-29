import { createServer } from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";

const root = process.cwd();
const port = 5173;
const host = "127.0.0.1";
const messagesFile = join(root, "data", "messages.json");
const accountFile = join(root, "data", "account.json");
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

const readMessages = async () => {
  try {
    const file = await readFile(messagesFile, "utf8");
    return JSON.parse(file);
  } catch {
    return [];
  }
};

const writeMessages = async (messages) => {
  await mkdir(dirname(messagesFile), { recursive: true });
  await writeFile(messagesFile, JSON.stringify(messages, null, 2));
};

const readAccount = async () => {
  try {
    const file = await readFile(accountFile, "utf8");
    const account = JSON.parse(file);
    const totpSecret = cleanText(account.totpSecret, 80).replace(/\s+/g, "").toUpperCase();

    return {
      email: cleanText(account.email, 120) || defaultAccount.email,
      password: cleanText(account.password, 120) || defaultAccount.password,
      twoFactorEnabled: account.twoFactorEnabled === true && Boolean(totpSecret),
      totpSecret,
      updatedAt: cleanText(account.updatedAt, 80),
    };
  } catch {
    return defaultAccount;
  }
};

const writeAccount = async (account) => {
  await mkdir(dirname(accountFile), { recursive: true });
  await writeFile(accountFile, JSON.stringify(account, null, 2));
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
