import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { setup } from "./petition-fixture.mjs";


test("name-only signatures persist without exposing anonymous identifiers", async () => {
  const { database, request, sign } = setup();
  const signerId = crypto.randomUUID();
  assert.equal((await sign({ signerId })).status, 201);
  const data = await (await request("/signatures")).json();
  assert.equal(data.total, 1);
  assert.equal(data.signatures[0].name, "Ada Lovelace");
  assert.deepEqual(Object.keys(data.signatures[0]).sort(), ["id", "name", "signedAt"]);
  assert.equal(JSON.stringify(data).includes(signerId), false);
  const stored = database.prepare("SELECT * FROM signatures").get();
  assert.equal(stored.signer_hash.length, 64);
  assert.equal(JSON.stringify(stored).includes(signerId), false);
  assert.equal("email_hash" in stored, false);
});
test("simultaneous submissions from the same browser count once", async () => {
  const { request, sign } = setup();
  const signerId = crypto.randomUUID();
  const responses = await Promise.all([sign({ signerId }), sign({ signerId })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  assert.equal((await (await request("/signatures")).json()).total, 1);
});
test("invalid fields, absent consent, and bot traps cannot write signatures", async () => {
  const { request, sign } = setup();
  for (const invalid of [{ signerId: "invalid" }, { name: "A" }, { name: "<script>bad</script>" }, { name: "https://spam.test" }, { consent: false }, { website: "spam" }, { startedAt: Date.now() + 10000 }]) assert.equal((await sign(invalid)).status, 400);
  assert.equal((await (await request("/signatures")).json()).total, 0);
});
test("data service rejects unauthorized writes and reads", async () => {
  const { request } = setup();
  assert.equal((await request("/signatures", "GET", undefined, false)).status, 401);
  assert.equal((await request("/signatures", "POST", {}, false)).status, 401);
});
test("public names paginate and moderation removes only the chosen signature", async () => {
  const { request, sign } = setup();
  for (let i = 0; i < 14; i++) assert.equal((await sign({ name: `Signer ${i}` })).status, 201);
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
  for (let i = 0; i < 100; i++) await sign();
  assert.equal((await sign()).status, 429);
  assert.equal((await sign({}, "other-ip")).status, 201);
  assert.equal((await (await request("/signatures")).json()).total, 101);
});


test("different browsers can sign with the same public name and no email", async () => {
  const { request, sign } = setup();
  assert.equal((await sign({ signerId: undefined })).status, 201);
  assert.equal((await sign()).status, 201);
  assert.equal((await (await request("/signatures")).json()).total, 2);
});

test("the migration preserves existing signatures", () => {
  const database = new DatabaseSync(":memory:");
  const migrations = new URL("../petition-api/drizzle/", import.meta.url);
  const files = readdirSync(migrations).filter(file => file.endsWith(".sql")).sort();
  database.exec(readFileSync(new URL(files[0], migrations), "utf8"));
  database.prepare("INSERT INTO signatures (id, name, email_hash, signed_at) VALUES (?, ?, ?, ?)").run("old-id", "Existing supporter", "legacy-fingerprint", "2026-10-01T00:00:00Z");
  for (const file of files.slice(1)) database.exec(readFileSync(new URL(file, migrations), "utf8"));
  assert.deepEqual({ ...database.prepare("SELECT * FROM signatures").get() }, { id: "old-id", name: "Existing supporter", signer_hash: "legacy-fingerprint", signed_at: "2026-10-01T00:00:00Z" });
  database.close();
});
