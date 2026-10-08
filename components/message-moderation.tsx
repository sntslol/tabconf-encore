"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { MessageStatus, ReviewSnapshot } from "@/lib/petition";

export function MessageModeration() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [status, setStatus] = useState<MessageStatus>("pending");
  const [snapshot, setSnapshot] = useState<ReviewSnapshot | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const requestVersion = useRef(0);
  const load = useCallback(async (offset = 0) => {
    const version = ++requestVersion.current;
    try {
      const response = await fetch(`/api/moderation/messages?status=${status}&offset=${offset}`, { cache: "no-store" });
      if (version !== requestVersion.current) return;
      if (response.status === 401) { setSignedIn(false); setSnapshot(null); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSignedIn(true); setError("");
      setSnapshot(current => offset && current ? { ...result, messages: [...current.messages, ...result.messages] } : result);
    } catch (error) { if (version === requestVersion.current) setError(error instanceof Error ? error.message : "Couldn’t load messages."); }
  }, [status]);
  useEffect(() => { setSnapshot(null); void load(); }, [load]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = new FormData(form).get("password");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/moderation/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset(); await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t sign in."); }
    finally { setBusy(false); }
  }
  async function review(id: string, nextStatus: MessageStatus) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/moderation/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: nextStatus }) });
      const result = await response.json();
      if (response.status === 401) { setSignedIn(false); setSnapshot(null); }
      if (!response.ok) throw new Error(result.error);
      setNotice(nextStatus === "approved" ? "Approved. This quote can now appear on the petition." : nextStatus === "rejected" ? "Hidden. This quote will not appear publicly." : "Returned to the pending queue.");
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t save the review."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/moderation/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Couldn’t sign out. Please try again.");
      setSignedIn(false); setSnapshot(null); setNotice(""); setError("");
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t sign out."); }
    finally { setBusy(false); }
  }
  return <>
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="moderation-notice" role="status">{notice}</p>}
    {signedIn === false ? <form onSubmit={login} className="moderator-login sign-form"><div className="field"><label htmlFor="moderator-password">Moderator password</label><input id="moderator-password" name="password" type="password" autoComplete="current-password" required maxLength={256} disabled={busy} /></div><button className="sign-button" disabled={busy}>{busy ? "Signing in…" : "Open the approval queue"}</button><p className="sign-note">Private access for the petition owner. Your session lasts 8 hours.</p></form> : signedIn === null ? <p>{error ? <button className="text-button" onClick={() => void load()}>Try again</button> : "Opening the approval queue…"}</p> : <>
      <div className="moderation-toolbar"><div className="moderation-tabs" aria-label="Message status">{(["pending", "approved", "rejected"] as const).map(tab => <button key={tab} className={tab === status ? "is-active" : ""} aria-pressed={tab === status} disabled={busy} onClick={() => { if (tab !== status) { requestVersion.current++; setSnapshot(null); setStatus(tab); setNotice(""); } }}>{tab === "rejected" ? "Hidden" : tab === "pending" ? "Pending" : "Approved"} {snapshot?.counts[tab] ?? "—"}</button>)}</div><div className="moderation-tools"><button className="text-button" disabled={busy} onClick={() => void load()}>Refresh</button><button className="text-button" disabled={busy} onClick={() => void logout()}>Sign out</button></div></div>
      {!snapshot ? <p>Loading messages…</p> : snapshot.messages.length === 0 ? <p className="moderation-empty">{status === "pending" ? "No messages waiting for approval. The mic is warming up." : "No messages here yet."}</p> : <><ul className="moderation-list">{snapshot.messages.map(item => <li className="moderation-card" key={item.id}><blockquote>“{item.message}”</blockquote><p className="moderation-author">— {item.name} <time dateTime={item.submittedAt}>{new Date(item.submittedAt).toLocaleString()}</time></p><div className="moderation-actions">{status === "pending" && <button className="approve-button" disabled={busy} onClick={() => void review(item.id, "approved")}>Approve</button>}{status !== "rejected" && <button disabled={busy} onClick={() => void review(item.id, "rejected")}>{status === "approved" ? "Hide quote" : "Reject"}</button>}{status === "rejected" && <button disabled={busy} onClick={() => void review(item.id, "pending")}>Return to review</button>}</div></li>)}</ul>{snapshot.hasMore && <button className="load-more" disabled={busy} onClick={() => { setBusy(true); void load(snapshot.messages.length).finally(() => setBusy(false)); }}>More messages</button>}</>}
    </>}
  </>;
}
