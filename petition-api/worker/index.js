const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

async function fingerprint(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
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
async function sign(request, env) {
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: "Please keep your name under 70 characters." }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: "Please check your details and try again." }, 400); }
  if (!body || typeof body !== "object") return json({ error: "Please check your details and try again." }, 400);
  const name = typeof body.name === "string" ? body.name.normalize("NFKC").trim().replace(/\s+/g, " ") : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (name.length < 2 || name.length > 70 || /[<>\u0000-\u001f\u007f]/.test(name) || /https?:\/\/|www\./i.test(name)) return json({ error: "Please enter a name between 2 and 70 characters, without links." }, 400);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "Please enter a valid email address." }, 400);
  if (body.consent !== true) return json({ error: "Please agree to display your name publicly." }, 400);
  const elapsed = Date.now() - Number(body.startedAt);
  if (body.website || !Number.isFinite(elapsed) || elapsed < 1200 || elapsed > 86400000) return json({ error: "Please refresh the page and try again." }, 400);
  if (!env.HASH_SECRET) throw new Error("Signature hashing is not configured.");
  const ip = request.headers.get("x-petition-ip") || "unknown";
  const now = Date.now();
  // A conference crowd may share one Wi-Fi address. Keep the network limit
  // generous; email uniqueness and the bot traps do the finer filtering.
  const key = await fingerprint(env.HASH_SECRET, `rate:${ip}:${Math.floor(now / 60000)}`);
  const rate = await env.DB.prepare("INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = rate_limits.count + 1 RETURNING count").bind(key, now + 86400000).first();
  if (rate.count > 100) return json({ error: "Too many attempts from this network. Please try again in one minute." }, 429);
  await env.DB.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(now).run();
  const emailHash = await fingerprint(env.HASH_SECRET, `email:${email}`);
  const signature = { id: crypto.randomUUID(), name, signedAt: new Date().toISOString() };
  const inserted = await env.DB.prepare("INSERT INTO signatures (id, name, email_hash, signed_at) VALUES (?, ?, ?, ?) ON CONFLICT(email_hash) DO NOTHING RETURNING id").bind(signature.id, signature.name, emailHash, signature.signedAt).first();
  if (!inserted) return json({ error: "This email has already signed. Thank you for supporting the encore!" }, 409);
  return json({ signature }, 201);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") return json({ service: "TABCONF ENCORE", status: "ok", petition: "https://tabconf-encore.vercel.app" });
    if (!await authorized(request, env)) return json({ error: "Unauthorized." }, 401);
    if (!env.DB) return json({ error: "The petition is temporarily unavailable." }, 503);
    try {
      if (url.pathname === "/signatures" && request.method === "GET") return await snapshot(request, env);
      if (url.pathname === "/signatures" && request.method === "POST") return await sign(request, env);
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
