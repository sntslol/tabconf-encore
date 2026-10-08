export type Signature = { id: string; name: string; signedAt: string };
export type PetitionSnapshot = { total: number; signatures: Signature[]; hasMore: boolean };
export type ApprovedQuote = { id: string; name: string; message: string };
export type MessageStatus = "pending" | "approved" | "rejected";
export type ReviewMessage = ApprovedQuote & { status: MessageStatus; submittedAt: string; reviewedAt: string | null };
export type ReviewSnapshot = { messages: ReviewMessage[]; counts: Record<MessageStatus, number>; hasMore: boolean };

export async function petitionRequest(path: string, options: RequestInit = {}) {
  const origin = process.env.PETITION_API_URL;
  const secret = process.env.PETITION_API_SECRET;
  if (!origin || !secret) throw new Error("Petition service is not configured.");
  return fetch(new URL(path, origin), {
    ...options,
    headers: {
      "Content-Type": "application/json", Authorization: `Bearer ${secret}`,
      ...(process.env.PETITION_SERVICE_TOKEN ? { "OAI-Sites-Authorization": `Bearer ${process.env.PETITION_SERVICE_TOKEN}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
}
