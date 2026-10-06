import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const display = localFont({ src: "../public/fonts/barlow-condensed-800.ttf", variable: "--font-display", display: "swap" });
const sans = localFont({ src: [
  { path: "../public/fonts/dm-sans-400.ttf", weight: "400" },
  { path: "../public/fonts/dm-sans-600.ttf", weight: "600" },
], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://tabconf-encore.vercel.app"),
  title: "TABCONF ENCORE — One more year. One more TABCONF.",
  description: "Let's keep building together. Add your name to the community petition for another year of TABCONF. Two fields. One voice. One more year.",
  openGraph: { title: "TABCONF ENCORE", description: "One more year. One more TABCONF. Sign the community petition.", type: "website", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "TABCONF ENCORE", description: "One more year. One more TABCONF. Add your name.", images: ["/og.png"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${display.variable} ${sans.variable}`}><body>{children}</body></html>;
}
