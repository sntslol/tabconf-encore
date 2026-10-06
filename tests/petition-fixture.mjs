import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import worker from "../petition-api/worker/index.js";

export function setup() {
  const database = new DatabaseSync(":memory:");
  const migrations = new URL("../petition-api/drizzle/", import.meta.url);
  for (const file of readdirSync(migrations).filter(file => file.endsWith(".sql")).sort()) database.exec(readFileSync(new URL(file, migrations), "utf8"));
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
  const sign = (overrides = {}, ip) => request("/signatures", "POST", { name: "Ada Lovelace", signerId: crypto.randomUUID(), consent: true, website: "", startedAt: Date.now() - 2000, ...overrides }, true, ip);
  return { database, request, sign };
}
