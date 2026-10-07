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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://savetabconf.com"),
  alternates: { canonical: "/" },
  title: "TABCONF ENCORE — One more year. One more TABCONF.",
  description: "The final TABCONF? We’re choosing denial. Sign the community petition for one more year. Your email stays private and is only for a petition milestone update.",
  openGraph: { title: "TABCONF ENCORE", description: "Please don’t roll the credits yet. Sign the community petition for one more year of TABCONF.", url: "/", type: "website", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "TABCONF ENCORE", description: "The final TABCONF? We’re choosing denial. Add your name for one more year.", images: ["/og.png"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${mono.variable} ${sans.variable}`}><body>{children}</body></html>;
}
