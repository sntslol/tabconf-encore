import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const MODERATOR_COOKIE = "encore-moderator";
export const SESSION_SECONDS = 8 * 60 * 60;

function secret() {
  const value = process.env.PETITION_ADMIN_PASSWORD;
  if (!value || value.length < 32) throw new Error("Moderation is not configured.");
  return value;
}
export function validPassword(password: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(secret()), digest(password));
}
export function createModeratorSession(now = Date.now()) {
  const payload = `v1.${Math.floor(now / 1000) + SESSION_SECONDS}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${createHmac("sha256", secret()).update(`moderation-session:${payload}`).digest("hex")}`;
}
export function validModeratorSession(token: string | undefined, now = Date.now()) {
  if (!token || !/^v1\.\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)) return false;
  const [version, expires, nonce, signature] = token.split(".");
  const expected = createHmac("sha256", secret()).update(`moderation-session:${version}.${expires}.${nonce}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex")) && Number(expires) > Math.floor(now / 1000);
}
export function isModerator(request: NextRequest) {
  return validModeratorSession(request.cookies.get(MODERATOR_COOKIE)?.value);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && [new URL(request.url).origin, process.env.NEXT_PUBLIC_SITE_URL].includes(origin);
}
export function moderationResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}
