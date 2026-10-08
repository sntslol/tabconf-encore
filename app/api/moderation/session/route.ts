import { petitionRequest } from "@/lib/petition";
import { createModeratorSession, MODERATOR_COOKIE, moderationResponse, sameOrigin, SESSION_SECONDS, validPassword } from "@/lib/moderation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return moderationResponse({ error: "Please sign in from the approval page." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return moderationResponse({ error: "Invalid request." }, 415);
  try {
    const raw = await request.text();
    if (raw.length > 512) return moderationResponse({ error: "Invalid sign-in." }, 400);
    const body = JSON.parse(raw);
    if (!body || typeof body.password !== "string" || body.password.length > 256) return moderationResponse({ error: "Enter the moderator password." }, 400);
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "local";
    const attempt = await petitionRequest("/moderation/login-attempt", { method: "POST", headers: { "X-Petition-IP": ip } });
    if (attempt.status === 429) return moderationResponse({ error: "Too many sign-in attempts. Please try again in 15 minutes." }, 429);
    if (!attempt.ok) throw new Error();
    if (!validPassword(body.password)) return moderationResponse({ error: "That password didn’t match." }, 401);
    const response = NextResponse.json({ signedIn: true }, { headers: { "Cache-Control": "private, no-store" } });
    response.cookies.set(MODERATOR_COOKIE, createModeratorSession(), { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "strict", path: "/api/moderation", maxAge: SESSION_SECONDS });
    return response;
  } catch { return moderationResponse({ error: "Sign-in is temporarily unavailable. Please try again." }, 503); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return moderationResponse({ error: "Invalid request." }, 403);
  const response = NextResponse.json({ signedIn: false }, { headers: { "Cache-Control": "private, no-store" } });
  response.cookies.set(MODERATOR_COOKIE, "", { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "strict", path: "/api/moderation", maxAge: 0 });
  return response;
}
