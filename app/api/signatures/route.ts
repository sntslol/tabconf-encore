import { petitionRequest } from "@/lib/petition";

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

export async function POST(request: Request) {
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
  try {
    // Vercel overwrites this header with the actual client IP. Do not trust a
    // caller-supplied x-forwarded-for chain for the persistent rate limiter.
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const response = await petitionRequest("/signatures", {
      method: "POST", headers: { "X-Petition-IP": ip }, body: JSON.stringify(body),
    });
    if (response.status >= 500) return unavailable();
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return unavailable(); }
}
