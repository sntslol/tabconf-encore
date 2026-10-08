const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

async function fingerprint(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
const unhex = value => Uint8Array.from(value.match(/../g) || [], byte => Number.parseInt(byte, 16));
async function notificationKey(env) {
  if (!env.HASH_SECRET) throw new Error("Notification email encryption is not configured.");
  // Domain separation keeps this key distinct from signature fingerprints.
  const material = await fingerprint(env.HASH_SECRET, "notification-email:aes-gcm:v1");
  return crypto.subtle.importKey("raw", unhex(material), "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptEmail(env, email, signatureId) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(signatureId) }, await notificationKey(env), encoder.encode(email));
  return `v1.${hex(iv)}.${hex(new Uint8Array(ciphertext))}`;
}
async function decryptEmail(env, sealed, signatureId) {
  const [version, iv, ciphertext] = sealed.split(".");
  if (version !== "v1" || !/^[a-f0-9]{24}$/.test(iv) || !/^(?:[a-f0-9]{2}){16,}$/.test(ciphertext)) throw new Error("Invalid notification ciphertext.");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unhex(iv), additionalData: new TextEncoder().encode(signatureId) }, await notificationKey(env), unhex(ciphertext));
  return new TextDecoder().decode(plaintext);
}
async function authorized(request, env) {
  if (!env.API_SECRET) return false;
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const [expected, supplied] = await Promise.all([fingerprint(env.API_SECRET, env.API_SECRET), fingerprint(env.API_SECRET, token)]);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return difference === 0;
}
async function snapshot(request, env) {
  const offsetText = new URL(request.url).searchParams.get("offset") || "0";
  if (!/^\d{1,6}$/.test(offsetText)) return json({ error: "Invalid page." }, 400);
  const offset = Number(offsetText);
  const [count, names] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS total FROM signatures"),
    env.DB.prepare("SELECT id, name, signed_at AS signedAt FROM signatures ORDER BY signed_at DESC, id DESC LIMIT 12 OFFSET ?").bind(offset),
  ]);
  const total = Number(count.results[0].total);
  return json({ total, signatures: names.results, hasMore: offset + names.results.length < total });
}
async function notificationContacts(request, env) {
  const offsetText = new URL(request.url).searchParams.get("offset") || "0";
  if (!/^\d{1,6}$/.test(offsetText)) return json({ error: "Invalid page." }, 400);
  const rows = (await env.DB.prepare("SELECT id, name, signed_at AS signedAt, email_ciphertext FROM signatures WHERE email_ciphertext IS NOT NULL ORDER BY signed_at DESC, id DESC LIMIT 101 OFFSET ?").bind(Number(offsetText)).all()).results;
  const contacts = await Promise.all(rows.slice(0, 100).map(async row => ({ id: row.id, name: row.name, signedAt: row.signedAt, email: await decryptEmail(env, row.email_ciphertext, row.id) })));
  return json({ contacts, hasMore: rows.length > 100 });
}
async function approvedMessages(env) {
  const quotes = (await env.DB.prepare("SELECT id, name, message FROM signatures WHERE message_status = 'approved' AND message IS NOT NULL ORDER BY message_reviewed_at DESC, id DESC LIMIT 100").all()).results;
  return json({ quotes });
}
async function reviewQueue(request, env) {
  const params = new URL(request.url).searchParams;
  const status = params.get("status") || "pending";
  const offset = params.get("offset") || "0";
  if (!["pending", "approved", "rejected"].includes(status) || !/^\d{1,6}$/.test(offset)) return json({ error: "Invalid review page." }, 400);
  const [items, counts] = await env.DB.batch([
    env.DB.prepare("SELECT id, name, message, message_status AS status, signed_at AS submittedAt, message_reviewed_at AS reviewedAt FROM signatures WHERE message_status = ? AND message IS NOT NULL ORDER BY signed_at DESC, id DESC LIMIT 21 OFFSET ?").bind(status, Number(offset)),
    env.DB.prepare("SELECT message_status AS status, COUNT(*) AS total FROM signatures WHERE message IS NOT NULL GROUP BY message_status"),
  ]);
  const totals = { pending: 0, approved: 0, rejected: 0 };
  for (const row of counts.results) if (row.status in totals) totals[row.status] = Number(row.total);
  return json({ messages: items.results.slice(0, 20), counts: totals, hasMore: items.results.length > 20 });
}
async function moderateMessage(request, env) {
  let body;
  try { const raw = await request.text(); if (raw.length > 512) return json({ error: "Invalid review." }, 400); body = JSON.parse(raw); }
  catch { return json({ error: "Invalid review." }, 400); }
  if (!body || typeof body.id !== "string" || !/^[a-f0-9-]{36}$/.test(body.id) || !["pending", "approved", "rejected"].includes(body.status)) return json({ error: "Invalid review." }, 400);
  const updated = await env.DB.prepare("UPDATE signatures SET message_status = ?, message_reviewed_at = ? WHERE id = ? AND message IS NOT NULL RETURNING id").bind(body.status, body.status === "pending" ? null : new Date().toISOString(), body.id).first();
  return updated ? json({ updated: true }) : json({ error: "Message not found." }, 404);
}
async function loginAttempt(request, env) {
  const now = Date.now();
  const key = await fingerprint(env.HASH_SECRET, `moderator-login:${request.headers.get("x-petition-ip") || "unknown"}:${Math.floor(now / 900000)}`);
  const rate = await env.DB.prepare("INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = rate_limits.count + 1 RETURNING count").bind(key, now + 86400000).first();
  return rate.count > 10 ? json({ error: "Too many sign-in attempts. Please try again in 15 minutes." }, 429) : json({ allowed: true });
}
async function sign(request, env) {
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: "Please keep your name under 70 characters." }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: "Please check your details and try again." }, 400); }
  if (!body || typeof body !== "object") return json({ error: "Please check your details and try again." }, 400);
  const name = typeof body.name === "string" ? body.name.normalize("NFKC").trim().replace(/\s+/g, " ") : "";
  if (typeof body.email !== "string") return json({ error: "Please enter your email so we can let you know if we get enough signatures." }, 400);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const signerId = body.signerId ?? crypto.randomUUID();
  if (name.length < 2 || name.length > 70 || /[<>\u0000-\u001f\u007f]/.test(name) || /https?:\/\/|www\./i.test(name)) return json({ error: "Please enter a name between 2 and 70 characters, without links." }, 400);
  if (body.initialsOnly !== undefined && typeof body.initialsOnly !== "boolean") return json({ error: "Please check your initials preference and try again." }, 400);
  if (body.message !== undefined && (typeof body.message !== "string" || body.message.length > 300)) return json({ error: "Please keep your message to 300 characters or less." }, 400);
  const message = typeof body.message === "string" ? body.message.normalize("NFKC").trim().replace(/\s+/g, " ") : "";
  if (message.length > 300 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) return json({ error: "Please keep your message to 300 characters or less, without control characters." }, 400);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "Please enter a valid email address. It will stay private." }, 400);
  if (typeof signerId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(signerId)) return json({ error: "Please refresh the page and try again." }, 400);
  if (body.consent !== true) return json({ error: "Please agree to display your name publicly." }, 400);
  const elapsed = Date.now() - Number(body.startedAt);
  if (body.website || !Number.isFinite(elapsed) || elapsed < 1200 || elapsed > 86400000) return json({ error: "Please refresh the page and try again." }, 400);
  if (!env.HASH_SECRET) throw new Error("Signature hashing is not configured.");
  const ip = request.headers.get("x-petition-ip") || "unknown";
  const now = Date.now();
  // A conference crowd may share one Wi-Fi address. Keep the network limit
  // generous; browser fingerprints and the bot traps do the finer filtering.
  const key = await fingerprint(env.HASH_SECRET, `rate:${ip}:${Math.floor(now / 60000)}`);
  const rate = await env.DB.prepare("INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = rate_limits.count + 1 RETURNING count").bind(key, now + 86400000).first();
  if (rate.count > 100) return json({ error: "Too many attempts from this network. Please try again in one minute." }, 429);
  await env.DB.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(now).run();
  const signerHash = await fingerprint(env.HASH_SECRET, `signer:${signerId}`);
  // Reduce the name before storage, so initials-only signers never have their
  // full name saved or returned by a public or maintainer endpoint.
  const publicName = body.initialsOnly === true ? name.split(" ").map(word => `${Array.from(word)[0].toUpperCase()}.`).join(" ") : name;
  const signature = { id: crypto.randomUUID(), name: publicName, signedAt: new Date().toISOString() };
  const emailCiphertext = await encryptEmail(env, email, signature.id);
  const inserted = await env.DB.prepare("INSERT INTO signatures (id, name, signer_hash, signed_at, email_ciphertext, message, message_status) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(signer_hash) DO NOTHING RETURNING id").bind(signature.id, signature.name, signerHash, signature.signedAt, emailCiphertext, message || null, message ? "pending" : null).first();
  if (!inserted) return json({ error: "This browser has already signed. Thank you for supporting the encore!" }, 409);
  return json({ signature, messagePending: !!message }, 201);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") return json({ service: "TABCONF ENCORE", status: "ok", petition: "https://savetabconf.com" });
    if (!await authorized(request, env)) return json({ error: "Unauthorized." }, 401);
    if (!env.DB) return json({ error: "The petition is temporarily unavailable." }, 503);
    try {
      if (url.pathname === "/signatures" && request.method === "GET") return await snapshot(request, env);
      if (url.pathname === "/signatures" && request.method === "POST") return await sign(request, env);
      if (url.pathname === "/messages" && request.method === "GET") return await approvedMessages(env);
      if (url.pathname === "/moderation/messages" && request.method === "GET") return await reviewQueue(request, env);
      if (url.pathname === "/moderation/messages" && request.method === "PATCH") return await moderateMessage(request, env);
      if (url.pathname === "/moderation/login-attempt" && request.method === "POST") return await loginAttempt(request, env);
      // Maintainer-only contact export. The Next.js public proxy exposes only
      // signature and approved-message reads; contacts require service credentials directly.
      if (url.pathname === "/notification-contacts" && request.method === "GET") return await notificationContacts(request, env);
      // Owner-only moderation; the API secret is never sent to the browser.
      if (url.pathname.startsWith("/signatures/") && request.method === "DELETE") {
        const id = url.pathname.split("/").pop();
        if (!/^[a-f0-9-]{36}$/.test(id)) return json({ error: "Invalid signature." }, 400);
        await env.DB.prepare("DELETE FROM signatures WHERE id = ?").bind(id).run();
        return json({ deleted: true });
      }
      return json({ error: "Not found." }, 404);
    } catch (error) {
      console.error("Petition database operation failed:", error instanceof Error ? error.name : "unknown");
      return json({ error: "The petition is temporarily unavailable. Please try again." }, 503);
    }
  },
};
