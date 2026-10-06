import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/signatures/route.ts";
import { setup } from "./petition-fixture.mjs";

test("name-only signing sets an anonymous cookie and blocks browser repeats", async t => {
  const { request, database } = setup();
  const environment = { PETITION_API_URL: "https://petition.test", PETITION_API_SECRET: "test-api-secret" };
  for (const [key, value] of Object.entries(environment)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const forwarded = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const body = JSON.parse(options.body);
    forwarded.push(body);
    assert.equal(new URL(url).pathname, "/signatures");
    return request("/signatures", "POST", body, true, options.headers["X-Petition-IP"]);
  });
  const callerSuppliedId = crypto.randomUUID();
  const payload = { name: "Same Name", website: "", consent: true, startedAt: Date.now() - 2000, signerId: callerSuppliedId, email: "discard-me@example.com" };
  const submit = (body, cookie) => POST(new NextRequest("https://encore.test/api/signatures", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://encore.test", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  }));

  const first = await submit(payload);
  assert.equal(first.status, 201);
  const cookie = first.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=lax/i);
  assert.match(cookie, /Path=\/api\/signatures/);
  assert.match(cookie, /Max-Age=31536000/);
  assert.equal("email" in forwarded[0], false);
  assert.notEqual(forwarded[0].signerId, callerSuppliedId);

  const repeat = await submit({ ...payload, signerId: crypto.randomUUID() }, cookie.split(";")[0]);
  assert.equal(repeat.status, 409);
  assert.equal(forwarded[1].signerId, forwarded[0].signerId);
  assert.equal((await submit({ name: "Same Name", consent: true, startedAt: Date.now() - 2000 })).status, 201);
  assert.equal((await (await request("/signatures")).json()).total, 2);
  assert.equal((await submit(null)).status, 400);
  assert.equal(forwarded.length, 3);
  database.close();
});
