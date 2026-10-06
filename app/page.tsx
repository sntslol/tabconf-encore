import { ArrowUpRight, CodeXml, MessageCircle, Heart, Sparkles } from "lucide-react";
import { Petition } from "@/components/petition";
import { ShareButton } from "@/components/share-button";

export default function Home() {
  return <>
    <a href="#sign" className="skip-link">Skip to sign the petition</a>
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="TABCONF ENCORE home"><span className="logo-mark" aria-hidden="true">t<span>↗</span></span><span>TABCONF<span className="wordmark-sub">ENCORE</span></span></a>
        <div className="header-right"><span className="community-label"><span className="live-dot" /> A community petition</span><ShareButton className="header-share" /><a className="mobile-sign-link" href="#sign">Sign the petition <ArrowUpRight size={16} /></a></div>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-eyebrow"><span className="mini-star">✳</span> THE NEXT CHAPTER IS UP TO US</div>
            <div className="encore-lockup"><div className="encore-pretitle">TABCONF PRESENTS <span>— THE COMMUNITY’S CALL</span></div><h1 id="hero-title">ENCORE<span className="title-period">.</span></h1><div className="underline-swoop" aria-hidden="true" /></div>
            <h2 className="hero-heading">One more year.<br />One more TABCONF.</h2>
            <p className="hero-description">The talks end. The connections don’t.<br />Let’s bring the Bitcoin builders back together<br className="desktop-break" /> for another year of TABCONF.</p>
            <div className="hero-bottom"><span className="hero-note"><Heart size={15} /> Built by the community. For the community.</span><div className="encore-stamp" aria-hidden="true"><Sparkles size={16} /><span>LET’S DO<br />THIS AGAIN</span><span className="stamp-arrow">↗</span></div></div>
            <span className="hero-star star-one" aria-hidden="true">✳</span><span className="hero-star star-two" aria-hidden="true">✦</span>
          </div>
          <Petition />
        </section>
        <section className="why-section" aria-labelledby="why-title">
          <div className="why-intro"><span className="section-kicker">GOOD THINGS DESERVE AN ENCORE</span><h2 id="why-title">Some things only happen<br />{" "}when we’re in the same room.</h2></div>
          <div className="reason"><CodeXml size={22} strokeWidth={1.6} /><h3>The building.</h3><p>Hands on keyboards.<br />Ideas becoming real.</p></div>
          <div className="reason"><MessageCircle size={22} strokeWidth={1.6} /><h3>The conversations.</h3><p>The hallway chats that<br />turn into the next big thing.</p></div>
          <div className="reason"><Heart size={22} strokeWidth={1.6} /><h3>The people.</h3><p>Old friends. New collaborators.<br />{" "}A community worth showing up for.</p></div>
        </section>
        <section className="petition-statement" aria-labelledby="petition-title"><span className="statement-star" aria-hidden="true">✳</span><div><span className="section-kicker">WHAT WE’RE ASKING</span><h2 id="petition-title">Let’s make room for one more.</h2><p>To the TABCONF organizers: thank you for creating a place for Bitcoin developers to learn, debate, and build together. We’d love to see TABCONF return for another year. Our signatures are a show of support for an encore — and for the people who make it happen.</p></div><a className="text-link" href="#sign">Add your voice <ArrowUpRight size={19} /></a></section>
      </main>
      <footer className="site-footer"><div><a href="/" className="footer-brand">TABCONF <span>ENCORE</span></a><p>A community-led petition. A little love for a very good thing.</p></div><nav aria-label="Footer"><a href="https://tabconf.com" target="_blank" rel="noreferrer">Visit TABCONF <ArrowUpRight size={13} /></a><a href="/privacy">Your privacy</a></nav></footer>
    </div>
  </>;
}
