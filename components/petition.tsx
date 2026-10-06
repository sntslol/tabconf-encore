"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, MoveUpRight, Radio } from "lucide-react";
import type { PetitionSnapshot } from "@/lib/petition";
import { ShareButton } from "./share-button";

export function Petition({ artwork, intro }: { artwork: ReactNode; intro: ReactNode }) {
  const [snapshot, setSnapshot] = useState<PetitionSnapshot | null>(null);
  const [loadingError, setLoadingError] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState(false);
  const [signer, setSigner] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const startedAt = useRef(0);
  const refresh = useCallback(async () => {
    try { const response = await fetch("/api/signatures", { cache: "no-store" }); if (!response.ok) throw new Error(); setSnapshot(await response.json()); setLoadingError(false); }
    catch { setLoadingError(true); }
  }, []);
  useEffect(() => { startedAt.current = Date.now(); void refresh(); const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30000); return () => clearInterval(timer); }, [refresh]);

  async function sign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(""); setPending(true);
    try {
      const response = await fetch("/api/signatures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), website: data.get("website"), consent: true, startedAt: startedAt.current }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Your signature wasn’t saved. Please try again."); return; }
      setSigner(result.signature.name); setSigned(true); form.reset(); await refresh();
    } catch { setError("Your signature couldn’t be confirmed. Please try again when you’re connected."); }
    finally { setPending(false); }
  }

  async function loadMore() {
    if (!snapshot || loadingMore) return;
    setLoadingMore(true);
    try { const response = await fetch(`/api/signatures?offset=${snapshot.signatures.length}`, { cache: "no-store" }); if (!response.ok) throw new Error(); const next: PetitionSnapshot = await response.json(); setSnapshot(current => current ? { ...next, signatures: [...current.signatures, ...next.signatures.filter(s => !current.signatures.some(old => old.id === s.id))] } : next); }
    catch { setError("Couldn’t load more signatures. Please try again."); }
    finally { setLoadingMore(false); }
  }

  return <><section className="home-hero" aria-labelledby="hero-title">{artwork}<div className="home-hero__body">{intro}<section className="sign-card" id="sign" aria-labelledby="sign-title">
    {signed ? <div className="success-state" role="status"><div className="success-icon"><Check size={30} /></div><span className="section-kicker">APPLAUSE INTENSIFIES</span><h2 id="sign-title">Thanks, {signer.split(" ")[0]}.</h2><p>Your name is on the petition.<br />Our very reasonable plea just got louder.</p><ShareButton className="success-share" /><a href="#supporters" className="success-supporters">See the community <ArrowRight size={15} /></a></div> : <>
      <h2 id="sign-title" className="visually-hidden">Sign the petition</h2>
      <form onSubmit={sign} className="sign-form">
        <div className="field"><label htmlFor="name">Your name <span>PUBLIC</span></label><input autoComplete="name" name="name" id="name" placeholder="Satoshi Nakamoto" minLength={2} maxLength={70} required disabled={pending} /></div>
        <div className="honeypot" aria-hidden="true"><label htmlFor="website">Leave this blank</label><input name="website" id="website" tabIndex={-1} autoComplete="off" /></div>
        <p className="sign-note">Just your name. No email. No account.</p>
        <button className="sign-button" disabled={pending} type="submit">{pending ? "Adding your name…" : "Sign for one more year"}<MoveUpRight size={20} /></button>
        <p className="consent-note">By signing, you support the petition and agree to display your name publicly. <a href="/privacy">Privacy details</a></p>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </>}
    <div className="signature-total" aria-live="polite"><strong>{snapshot ? snapshot.total.toLocaleString() : "—"} <span>{snapshot?.total === 1 ? "signature" : "signatures"}</span></strong><a href="#supporters">View signatures <ArrowRight size={13} /></a></div>
  </section></div></section>
  <section className="supporters-section" id="supporters" aria-labelledby="supporters-title"><div className="supporters-heading"><h2 id="supporters-title">Community signatures</h2><span><Radio size={13} /> LIVE</span></div>
    {loadingError ? <div className="supporter-empty"><p>Couldn’t load the signatures.</p><button onClick={() => void refresh()} type="button">Try again <ArrowRight size={14} /></button></div> : !snapshot ? <p className="supporters-loading">Getting the community together…</p> : snapshot.total === 0 ? <div className="supporter-empty"><p>No signatures yet. Someone has to start the slow clap.</p><a href="#sign">Start the encore <ArrowRight size={14} /></a></div> : <><ul className="supporter-list">{snapshot.signatures.map(signature => <li key={signature.id}><span className="supporter-avatar" aria-hidden="true">{signature.name.split(/\s+/).map(word => Array.from(word)[0]).slice(0, 2).join("").toUpperCase()}</span><span>{signature.name}</span><Check size={13} /></li>)}</ul>{snapshot.hasMore && <button className="load-more" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "More signatures"} <ArrowRight size={14} /></button>}</>}
  </section></>;
}
