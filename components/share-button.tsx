"use client";
import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://savetabconf.com";

export function ShareButton({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
  async function share() {
    const url = SITE_URL;
    if (navigator.share) {
      try { await navigator.share({ title: "TABCONF ENCORE", text: "The final TABCONF? We’re choosing denial. Add your name for one more year.", url }); return; }
      catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 3000); }
    catch { setFallback(true); }
  }
  return <span className="share-wrap"><button type="button" onClick={share} className={`share-button ${className}`} aria-live="polite">{copied ? <><Check size={16} /> Link copied</> : <>Share the petition <ArrowUpRight size={17} /></>}</button>{fallback && <input aria-label="Copy this petition link" value={SITE_URL} readOnly onFocus={event => event.target.select()} className="share-fallback" />}</span>;
}
