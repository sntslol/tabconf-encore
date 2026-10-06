import Link from "next/link";
export const metadata = { title: "Your privacy — TABCONF ENCORE" };
export default function Privacy() {
  return (
    <main className="privacy-page">
      <Link href="/" className="text-link">← Back to the petition</Link>
      <span className="section-kicker">TABCONF ENCORE</span>
      <h1>Your name. Your voice.<br />Your privacy.</h1>
      <h2>Just your name</h2>
      <p>The name you enter appears on the petition’s public signature list, along with the time you signed. Use the name you’re comfortable sharing. We don’t ask for an email address or an account.</p>
      <h2>Preventing repeat signatures</h2>
      <p>After you sign, we set a small cookie containing a random, anonymous browser identifier. It lasts for one year and helps prevent this browser from signing again. We store only a cryptographic fingerprint of that identifier, never an email address. The identifier is not displayed publicly.</p>
      <h2>Keeping the petition fair</h2>
      <p>We temporarily store a cryptographic fingerprint of your network address to limit automated submissions. These records expire after 24 hours. We don’t use advertising cookies or tracking analytics.</p>
      <h2>Removing your signature</h2>
      <p>You can request removal through an issue in the <a href="https://github.com/sntslol/tabconf-encore/issues" target="_blank" rel="noreferrer">project repository</a>. Include the public name and signature time. Maintainers review removal requests; please don’t post private contact information.</p>
      <h2>A community request</h2>
      <p>This petition expresses support for another year of TABCONF. It does not announce or guarantee a future event.</p>
    </main>
  );
}
