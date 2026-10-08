import { petitionRequest } from "@/lib/petition";
import { isModerator, moderationResponse, sameOrigin } from "@/lib/moderation";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!isModerator(request)) return moderationResponse({ error: "Please sign in to review messages." }, 401);
    const status = request.nextUrl.searchParams.get("status") || "pending";
    const offset = request.nextUrl.searchParams.get("offset") || "0";
    if (!["pending", "approved", "rejected"].includes(status) || !/^\d{1,6}$/.test(offset)) return moderationResponse({ error: "Invalid review page." }, 400);
    const response = await petitionRequest(`/moderation/messages?status=${status}&offset=${offset}`);
    if (!response.ok) throw new Error();
    return moderationResponse(await response.json());
  } catch { return moderationResponse({ error: "Couldn’t load messages. Please try again." }, 503); }
}
export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return moderationResponse({ error: "Please review from the approval page." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return moderationResponse({ error: "Invalid request." }, 415);
  try {
    if (!isModerator(request)) return moderationResponse({ error: "Please sign in to review messages." }, 401);
    const raw = await request.text();
    if (raw.length > 512) return moderationResponse({ error: "Invalid review." }, 400);
    let body;
    try { body = JSON.parse(raw); } catch { return moderationResponse({ error: "Invalid review." }, 400); }
    if (!body || typeof body.id !== "string" || !/^[a-f0-9-]{36}$/.test(body.id) || !["pending", "approved", "rejected"].includes(body.status)) return moderationResponse({ error: "Invalid review." }, 400);
    const response = await petitionRequest("/moderation/messages", { method: "PATCH", body: JSON.stringify({ id: body.id, status: body.status }) });
    if (response.status >= 500) throw new Error();
    return moderationResponse(await response.json(), response.status);
  } catch { return moderationResponse({ error: "Couldn’t save that review. Please try again." }, 503); }
}
