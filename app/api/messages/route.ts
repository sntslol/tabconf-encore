import { petitionRequest } from "@/lib/petition";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await petitionRequest("/messages");
    if (!response.ok) throw new Error();
    return Response.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Community quotes are temporarily unavailable." }, { status: 503 });
  }
}
