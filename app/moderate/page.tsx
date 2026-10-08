import Link from "next/link";
import { MessageModeration } from "@/components/message-moderation";

export const metadata = { title: "Message approvals — SAVE TABCONF", robots: { index: false, follow: false }, alternates: { canonical: "/moderate" } };

export default function Moderate() {
  return <main className="moderation-page"><Link href="/" className="text-link">← Back to the petition</Link><p className="section-kicker">SAVE TABCONF · FOR YOUR EYES FIRST</p><h1>Message approvals</h1><p>Give the community the mic. Messages appear beneath SAVE TABCONF only after you approve them.</p><MessageModeration /></main>;
}
