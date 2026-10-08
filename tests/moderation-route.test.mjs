import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, PATCH } from "../app/api/moderation/messages/route.ts";
import { POST as login, DELETE as logout } from "../app/api/moderation/session/route.ts";
import { GET as publicQuotes } from "../app/api/messages/route.ts";
import { createModeratorSession, validModeratorSession } from "../lib/moderation.ts";
import { setup } from "./petition-fixture.mjs";

test("private approval API requires a signed owner session and same-origin writes", async t => {
  const { request, sign, database } = setup();
  const password = "test-only-moderator-password-123456789";
  for (const [key, value] of Object.entries({ PETITION_ADMIN_PASSWORD: password, PETITION_API_URL: "https://petition.test", PETITION_API_SECRET: "test-api-secret" })) {
    const previous = process.env[key]; process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  t.mock.method(globalThis, "fetch", async (url, options) => request(new URL(url).pathname + new URL(url).search, options.method || "GET", options.body ? JSON.parse(options.body) : undefined, options.headers.Authorization === "Bearer test-api-secret", options.headers["X-Petition-IP"]));
  const next = (path, method = "GET", body, cookie, origin = "https://encore.test") => new NextRequest(`https://encore.test${path}`, { method, headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const submitted = await (await sign({ message: "We need the builders together.", initialsOnly: true })).json();
  const action = { id: submitted.signature.id, status: "approved" };
  assert.equal((await GET(next("/api/moderation/messages"))).status, 401);
  assert.equal((await PATCH(next("/api/moderation/messages", "PATCH", action))).status, 401);
  assert.equal((await login(next("/api/moderation/session", "POST", { password }, undefined, "https://elsewhere.test"))).status, 403);
  assert.equal((await login(next("/api/moderation/session", "POST", { password: "wrong" }))).status, 401);
  const signedIn = await login(next("/api/moderation/session", "POST", { password }));
  assert.equal(signedIn.status, 200);
  const cookie = signedIn.headers.get("set-cookie");
  for (const pattern of [/HttpOnly/, /Secure/, /SameSite=strict/i, /Path=\/api\/moderation/, /Max-Age=28800/]) assert.match(cookie, pattern);
  assert.equal(cookie.includes(password), false);
  assert.equal((await GET(next("/api/moderation/messages", "GET", undefined, cookie.split(";")[0]))).status, 200);
  assert.deepEqual((await (await publicQuotes()).json()).quotes, []);
  assert.equal((await PATCH(next("/api/moderation/messages", "PATCH", action, cookie, "https://elsewhere.test"))).status, 403);
  assert.equal((await PATCH(next("/api/moderation/messages", "PATCH", action, cookie, null))).status, 403);
  assert.equal((await PATCH(next("/api/moderation/messages", "PATCH", action, cookie))).status, 200);
  const published = await (await publicQuotes()).json();
  assert.equal(published.quotes[0].name, "A. L.");
  assert.equal(published.quotes[0].message, "We need the builders together.");
  assert.equal(JSON.stringify(published).includes("ada@example.com"), false);
  assert.equal((await PATCH(next("/api/moderation/messages", "PATCH", { ...action, status: "rejected" }, cookie))).status, 200);
  assert.deepEqual((await (await publicQuotes()).json()).quotes, []);
  const signedOut = await logout(next("/api/moderation/session", "DELETE"));
  assert.match(signedOut.headers.get("set-cookie"), /Max-Age=0/);
  const session = createModeratorSession();
  assert.equal(validModeratorSession(session), true);
  assert.equal(validModeratorSession(session, Date.now() + 9 * 60 * 60 * 1000), false);
  assert.equal(validModeratorSession(session.slice(0, -1) + (session.endsWith("a") ? "b" : "a")), false);
  assert.equal(validModeratorSession("forged"), false);
  database.close();
});
