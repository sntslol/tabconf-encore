import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Petition } from "@/components/petition";
import { ShareButton } from "@/components/share-button";

export default function Home() {
  return (
    <>
      <a href="#sign" className="skip-link">Skip to sign the petition</a>
      <header className="site-header">
        <div className="site-header__inner">
          <a className="site-title" href="/" aria-label="TABCONF ENCORE home">
            <span className="site-title__prompt" aria-hidden="true"><span className="site-title__dot" /></span>
            <span className="site-title__word"><span className="site-title__tab">TAB</span><span className="site-title__conf">Conf</span></span>
            <span className="site-title__ver">ENCORE</span>
          </a>
          <ShareButton className="header-share" />
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <p className="sidebar__heading">One more year</p>
          <nav className="sidebar__nav" aria-label="Petition">
            <a className="sidebar__link is-active" href="#sign">Sign the petition</a>
            <a className="sidebar__link" href="#supporters">Community signatures</a>
            <a className="sidebar__link" href="#petition">Why an encore?</a>
            <span className="sidebar__rule" />
            <a className="sidebar__link" href="https://tabconf.com" target="_blank" rel="noreferrer">Visit TABConf <ArrowUpRight size={13} /></a>
            <a className="sidebar__link" href="/privacy">Your privacy</a>
          </nav>
        </aside>

        <main className="layout__main site-main">
          <Petition
            artwork={
              <figure className="home-hero__art">
                <a href="https://tabconf.com" target="_blank" rel="noreferrer" aria-label="Visit TABCONF’s official website">
                  <Image src="/brand/tabconf8-poster.webp" width={900} height={1372} sizes="(min-width: 1200px) 387px, (min-width: 900px) 34vw, (min-width: 600px) 440px, 85vw" loading="eager" alt="TABCONF 8 poster: a builder sitting among glowing green monitors and computers." />
                </a>
                <figcaption className="home-hero__credit">Poster art by <a href="https://nogood.studio" target="_blank" rel="noreferrer">NoGood</a></figcaption>
              </figure>
            }
            intro={
              <div className="encore-intro">
                <p className="home-hero__eyebrow">A very reasonable plea</p>
                <Image className="home-hero__logo" src="/brand/tabconf8-logo.png" width={720} height={411} sizes="250px" loading="eager" alt="TABCONF 8 — the official colorful keycap logo" />
                <h1 id="hero-title">ENCORE</h1>
                <p className="home-hero__tagline">One more year. One more TABCONF.</p>
                <p className="home-hero__plea">“The final TABCONF”? We’re choosing denial.</p>
              </div>
            }
          />

          <section className="petition-statement" id="petition" aria-labelledby="petition-title">
            <p className="section-kicker">Technical. Accessible. Bitcoin. Community.</p>
            <h2 id="petition-title">Please don’t roll the credits yet.</h2>
            <p>TABCONF is where Bitcoin builders turn hallway conversations into real projects. We’re not emotionally prepared to replace that with a group chat.</p>
            <p>To the organizers: thank you for all the work behind this. We know another year is a big ask. Consider this our standing ovation, mildly disguised as a petition: please bring TABCONF back for one more.</p>
            <a className="text-link" href="#sign">Add your voice <ArrowUpRight size={16} /></a>
          </section>
        </main>
      </div>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <p className="site-footer__tagline">TABConf ENCORE · One community. One more year.</p>
          <p>Community-led. Slightly dramatic. Very sincere.</p>
          <nav aria-label="Footer"><a href="https://tabconf.com" target="_blank" rel="noreferrer">TABConf.com</a><a href="/privacy">Privacy</a><a href="https://github.com/sntslol/tabconf-encore" target="_blank" rel="noreferrer">Source code</a></nav>
        </div>
      </footer>
    </>
  );
}
