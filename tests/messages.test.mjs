import test from "node:test";
import assert from "node:assert/strict";
import { setup } from "./petition-fixture.mjs";

test("messages require owner approval, use public initials, and can be hidden again", async () => {
  const { database, request, sign } = setup();
  const message = "The builders and hallway conversations make this irreplaceable.";
  const result = await (await sign({ message, initialsOnly: true, messageStatus: "approved" })).json();
  assert.equal(result.messagePending, true);
  assert.equal(result.signature.name, "A. L.");
  assert.equal(JSON.stringify(result).includes(message), false);
  assert.equal(database.prepare("SELECT message_status FROM signatures").get().message_status, "pending");
  assert.deepEqual((await (await request("/messages")).json()).quotes, []);
  assert.equal(JSON.stringify(await (await request("/signatures")).json()).includes(message), false);
  const pending = await (await request("/moderation/messages")).json();
  assert.equal(pending.messages[0].name, "A. L.");
  assert.equal(pending.messages[0].message, message);
  assert.equal(JSON.stringify(pending).includes("Ada Lovelace"), false);
  assert.equal(JSON.stringify(pending).includes("ada@example.com"), false);
  assert.deepEqual(pending.counts, { pending: 1, approved: 0, rejected: 0 });
  const review = status => request("/moderation/messages", "PATCH", { id: result.signature.id, status });
  assert.equal((await review("approved")).status, 200);
  assert.deepEqual((await (await request("/messages")).json()).quotes, [{ id: result.signature.id, name: "A. L.", message }]);
  assert.equal((await review("rejected")).status, 200);
  assert.deepEqual((await (await request("/messages")).json()).quotes, []);
  assert.equal((await review("pending")).status, 200);
  assert.equal(database.prepare("SELECT message_reviewed_at FROM signatures").get().message_reviewed_at, null);
  assert.equal((await review("approved")).status, 200);
  await request(`/signatures/${result.signature.id}`, "DELETE");
  assert.deepEqual((await (await request("/messages")).json()).quotes, []);
  database.close();
});

test("messages are optional and the 300-character boundary is enforced on the server", async () => {
  const { database, request, sign } = setup();
  for (const message of [undefined, "", "   "]) {
    const result = await (await sign({ message })).json();
    assert.equal(result.messagePending, false);
    assert.equal(database.prepare("SELECT message FROM signatures WHERE id = ?").get(result.signature.id).message, null);
  }
  assert.equal((await sign({ message: "a".repeat(300) })).status, 201);
  for (const message of ["a".repeat(301), "ﬃ".repeat(101), 42, null, [], "bad\u0000message"]) assert.equal((await sign({ message })).status, 400);
  assert.equal((await (await request("/signatures")).json()).total, 4);
  assert.equal((await (await request("/moderation/messages")).json()).messages.length, 1);
  database.close();
});

test("review endpoints reject unauthorized access and invalid status or IDs", async () => {
  const { database, request } = setup();
  for (const [path, method, body] of [["/messages", "GET"], ["/moderation/messages", "GET"], ["/moderation/messages", "PATCH", { id: crypto.randomUUID(), status: "approved" }], ["/moderation/login-attempt", "POST"]]) assert.equal((await request(path, method, body, false)).status, 401);
  for (const body of [null, { id: "invalid", status: "approved" }, { id: crypto.randomUUID(), status: "published" }]) assert.equal((await request("/moderation/messages", "PATCH", body)).status, 400);
  assert.equal((await request("/moderation/messages", "PATCH", { id: crypto.randomUUID(), status: "approved" })).status, 404);
  assert.equal((await request("/moderation/messages?status=all")).status, 400);
  assert.equal((await request("/moderation/messages?offset=invalid")).status, 400);
  database.close();
});

test("review pagination includes all messages and status counts", async () => {
  const { database, request, sign } = setup();
  for (let i = 0; i < 23; i++) await sign({ name: `Supporter ${i}`, message: `Reason ${i}` });
  const first = await (await request("/moderation/messages")).json();
  const second = await (await request("/moderation/messages?offset=20")).json();
  assert.equal(first.messages.length, 20); assert.equal(first.hasMore, true);
  assert.equal(second.messages.length, 3); assert.equal(second.hasMore, false);
  assert.equal(new Set([...first.messages, ...second.messages].map(m => m.id)).size, 23);
  await request("/moderation/messages", "PATCH", { id: first.messages[0].id, status: "approved" });
  assert.deepEqual((await (await request("/moderation/messages")).json()).counts, { pending: 22, approved: 1, rejected: 0 });
  database.close();
});

test("owner sign-in attempts are rate limited independently from petition signers", async () => {
  const { database, request, sign } = setup();
  for (let i = 0; i < 10; i++) assert.equal((await request("/moderation/login-attempt", "POST")).status, 200);
  assert.equal((await request("/moderation/login-attempt", "POST")).status, 429);
  assert.equal((await request("/moderation/login-attempt", "POST", undefined, true, "other-ip")).status, 200);
  assert.equal((await sign()).status, 201);
  database.close();
});
