import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../petition-api/worker/index.js";

function setup() {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../petition-api/drizzle/0000_luxuriant_synch.sql", import.meta.url), "utf8"));
  const prepare = sql => {
    let params = [];
    return {
      bind(...values) { params = values; return this; },
      async first() { return database.prepare(sql).get(...params) || null; },
      async all() { return { results: database.prepare(sql).all(...params) }; },
      async run() { return database.prepare(sql).run(...params); },
    };
  };
  const env = { API_SECRET: "test-api-secret", HASH_SECRET: "test-hash-secret", DB: { prepare, async batch(statements) { return Promise.all(statements.map(statement => statement.all())); } } };
  const request = (path, method = "GET", body, authenticated = true, ip = "test-ip") => worker.fetch(new Request(`https://petition.test${path}`, {
    method, headers: { ...(authenticated ? { Authorization: "Bearer test-api-secret" } : {}), "Content-Type": "application/json", "X-Petition-IP": ip },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }), env);
  const sign = (overrides = {}, ip) => request("/signatures", "POST", { name: "Ada Lovelace", email: "ada@example.com", consent: true, website: "", startedAt: Date.now() - 2000, ...overrides }, true, ip);
  return { database, request, sign };
}

test("signatures persist and the public list never exposes email or hashes", async () => {
  const { database, request, sign } = setup();
  assert.equal((await sign()).status, 201);
  const data = await (await request("/signatures")).json();
  assert.equal(data.total, 1);
  assert.equal(data.signatures[0].name, "Ada Lovelace");
  assert.deepEqual(Object.keys(data.signatures[0]).sort(), ["id", "name", "signedAt"]);
  assert.equal(JSON.stringify(data).includes("ada@example.com"), false);
  const stored = database.prepare("SELECT * FROM signatures").get();
  assert.equal(stored.email_hash.length, 64);
  assert.equal(JSON.stringify(stored).includes("ada@example.com"), false);
});
test("case-insensitive duplicates and simultaneous submissions count once", async () => {
  const { request, sign } = setup();
  const responses = await Promise.all([sign(), sign({ email: " ADA@EXAMPLE.COM " })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  assert.equal((await (await request("/signatures")).json()).total, 1);
});
test("invalid fields, absent consent, and bot traps cannot write signatures", async () => {
  const { request, sign } = setup();
  for (const invalid of [{ email: "not-email" }, { name: "A" }, { name: "<script>bad</script>" }, { name: "https://spam.test" }, { consent: false }, { website: "spam" }, { startedAt: Date.now() + 10000 }]) assert.equal((await sign(invalid)).status, 400);
  assert.equal((await (await request("/signatures")).json()).total, 0);
});
test("data service rejects unauthorized writes and reads", async () => {
  const { request } = setup();
  assert.equal((await request("/signatures", "GET", undefined, false)).status, 401);
  assert.equal((await request("/signatures", "POST", {}, false)).status, 401);
});
test("public names paginate and moderation removes only the chosen signature", async () => {
  const { request, sign } = setup();
  for (let i = 0; i < 14; i++) assert.equal((await sign({ name: `Signer ${i}`, email: `signer${i}@example.com` })).status, 201);
  const first = await (await request("/signatures")).json();
  const second = await (await request("/signatures?offset=12")).json();
  assert.equal(first.total, 14); assert.equal(first.signatures.length, 12); assert.equal(first.hasMore, true);
  assert.equal(second.signatures.length, 2); assert.equal(second.hasMore, false);
  assert.equal(new Set([...first.signatures, ...second.signatures].map(s => s.id)).size, 14);
  assert.equal((await request(`/signatures/${first.signatures[0].id}`, "DELETE")).status, 200);
  assert.equal((await (await request("/signatures")).json()).total, 13);
});
test("rate limits persist in the database and keep separate networks independent", async () => {
  const { request, sign } = setup();
  for (let i = 0; i < 15; i++) await sign({ email: `rate${i}@example.com` });
  assert.equal((await sign({ email: "limited@example.com" })).status, 429);
  assert.equal((await sign({ email: "other@example.com" }, "other-ip")).status, 201);
  assert.equal((await (await request("/signatures")).json()).total, 16);
});
