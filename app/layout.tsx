import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const mono = localFont({ src: [
  { path: "../public/fonts/jetbrains-mono-400.ttf", weight: "400" },
  { path: "../public/fonts/jetbrains-mono-500.ttf", weight: "500" },
], variable: "--font-mono", display: "swap" });
const sans = localFont({ src: [
  { path: "../public/fonts/instrument-sans-400.ttf", weight: "400" },
  { path: "../public/fonts/instrument-sans-600.ttf", weight: "600" },
  { path: "../public/fonts/instrument-sans-700.ttf", weight: "700" },
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
  return <html lang="en" className={`${mono.variable} ${sans.variable}`}><body>{children}</body></html>;
}
