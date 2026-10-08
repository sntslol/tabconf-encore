"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { ApprovedQuote } from "@/lib/petition";

export function ApprovedQuotes() {
  const [quotes, setQuotes] = useState<ApprovedQuote[]>([]);
  const [activeId, setActiveId] = useState("");
  const [paused, setPaused] = useState(false);
  const index = Math.max(0, quotes.findIndex(quote => quote.id === activeId));
  const quote = quotes[index];
  useEffect(() => {
    let disposed = false;
    async function refresh() {
      try {
        const response = await fetch("/api/messages", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const result: { quotes: ApprovedQuote[] } = await response.json();
        if (!disposed) setQuotes(current => current.length === result.quotes.length && current.every((item, i) => item.id === result.quotes[i].id && item.name === result.quotes[i].name && item.message === result.quotes[i].message) ? current : result.quotes);
      } catch { if (!disposed) setQuotes([]); }
    }
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(preference.matches);
    const updatePreference = () => setPaused(preference.matches);
    preference.addEventListener("change", updatePreference);
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    return () => { disposed = true; clearInterval(timer); preference.removeEventListener("change", updatePreference); };
  }, []);
  useEffect(() => {
    if (paused || quotes.length < 2) return;
    const timer = setInterval(() => { if (!document.hidden) setActiveId(quotes[(index + 1) % quotes.length].id); }, 5000);
    return () => clearInterval(timer);
  }, [index, paused, quotes]);
  if (!quote) return null;
  return <section className="campaign-quote" aria-label="Voices from the TABCONF community" aria-roledescription="carousel" aria-live="off">
    <div className="campaign-quote__stage">{quotes.map((item, i) => <figure key={item.id} className={`campaign-quote__slide${item.id === quote.id ? " is-active" : ""}`} role="group" aria-roledescription="slide" aria-label={`Quote ${i + 1} of ${quotes.length}`} aria-hidden={item.id !== quote.id}><blockquote>“{item.message}”</blockquote><figcaption><cite>— {item.name}</cite></figcaption></figure>)}</div>
    {quotes.length > 1 && <div className="campaign-quote__controls"><button aria-label="Previous community quote" onClick={() => { setPaused(true); setActiveId(quotes[(index - 1 + quotes.length) % quotes.length].id); }}><ChevronLeft size={14} /></button><span>{index + 1} / {quotes.length}</span><button aria-label={paused ? "Resume quote rotation" : "Pause quote rotation"} onClick={() => setPaused(current => !current)}>{paused ? <Play size={13} /> : <Pause size={13} />}</button><button aria-label="Next community quote" onClick={() => { setPaused(true); setActiveId(quotes[(index + 1) % quotes.length].id); }}><ChevronRight size={14} /></button></div>}
  </section>;
}
