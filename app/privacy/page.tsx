import Link from "next/link";
export const metadata = { title: "Your privacy — SAVE TABCONF", alternates: { canonical: "/privacy" } };
export default function Privacy() {
  return (
    <main className="privacy-page">
      <Link href="/" className="text-link">← Back to the petition</Link>
      <span className="section-kicker">SAVE TABCONF · ENCORE</span>
      <h1>Your name. Your voice.<br />Your privacy.</h1>
      <h2>What appears publicly</h2>
      <p>The name you enter appears on the petition’s public signature list, along with the time you signed. Use the name you’re comfortable sharing. If you check “Only show my initials,” we save and display only your initials; your full name is not saved. Your email never appears on the public list.</p>
      <h2>Your private email</h2>
      <p>Email is required to sign, so we can let you know if we get enough signatures. That is its only use. We store it encrypted, and only the petition maintainer can access it for that purpose. Your email is never shown publicly and does not subscribe you to a newsletter or marketing list.</p>
      <h2>Preventing repeat signatures</h2>
      <p>After you sign, we set a small cookie containing a random, anonymous browser identifier. It lasts for one year and helps prevent this browser from signing again. We store only a cryptographic fingerprint of that identifier. The identifier is not displayed publicly.</p>
      <h2>Keeping the petition fair</h2>
      <p>We temporarily store a cryptographic fingerprint of your network address to limit automated submissions. These records expire after 24 hours. We don’t use advertising cookies or tracking analytics.</p>
      <h2>Removing your signature</h2>
      <p>You can request removal of your signature and any associated email through an issue in the <a href="https://github.com/sntslol/tabconf-encore/issues" target="_blank" rel="noreferrer">project repository</a>. Include the public name and signature time. Maintainers review removal requests; please don’t post your email or other private contact information.</p>
      <h2>A community request</h2>
      <p>This petition expresses support for another year of TABCONF. It does not announce or guarantee a future event.</p>
    </main>
  );
}
