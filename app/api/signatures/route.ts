import { petitionRequest } from "@/lib/petition";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function unavailable() {
  return Response.json({ error: "The petition is temporarily unavailable. Please try again in a moment." }, { status: 503 });
}

export async function GET(request: Request) {
  const offset = new URL(request.url).searchParams.get("offset") ?? "0";
  if (!/^\d{1,6}$/.test(offset)) return Response.json({ error: "Invalid page." }, { status: 400 });
  try {
    const response = await petitionRequest(`/signatures?offset=${offset}`);
    if (!response.ok) return unavailable();
    return Response.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch { return unavailable(); }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigins = [new URL(request.url).origin, process.env.NEXT_PUBLIC_SITE_URL].filter(Boolean);
  let sameHost = false;
  try { sameHost = !!origin && new URL(origin).host === request.headers.get("host"); } catch { /* Invalid origins are rejected below. */ }
  if (origin && !sameHost && !allowedOrigins.includes(origin)) return Response.json({ error: "Please sign from the petition page." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Invalid request." }, { status: 415 });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return Response.json({ error: "Please keep your name under 70 characters." }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return Response.json({ error: "Please check your details and try again." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Please enter your name and try again." }, { status: 400 });
  // A random browser identifier replaces email-based duplicate detection.
  // Read it only from our cookie; never accept a caller-supplied signer ID.
  const previousSigner = request.cookies.get("encore-signer")?.value;
  const signerId = previousSigner && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(previousSigner)
    ? previousSigner : crypto.randomUUID();
  try {
    // Vercel overwrites this header with the actual client IP. Do not trust a
    // caller-supplied x-forwarded-for chain for the persistent rate limiter.
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const response = await petitionRequest("/signatures", {
      method: "POST", headers: { "X-Petition-IP": ip },
      body: JSON.stringify({ name: body.name, website: body.website, consent: body.consent, startedAt: body.startedAt, signerId }),
    });
    if (response.status >= 500) return unavailable();
    const result = NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
    if (response.ok || response.status === 409) result.cookies.set("encore-signer", signerId, {
      httpOnly: true, secure: new URL(request.url).protocol === "https:",
      sameSite: "lax", path: "/api/signatures", maxAge: 365 * 24 * 60 * 60,
    });
    return result;
  } catch { return unavailable(); }
}
