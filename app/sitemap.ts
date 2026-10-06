import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://tabconf-encore.vercel.app";
  return [{ url: origin, changeFrequency: "daily", priority: 1 }, { url: `${origin}/privacy`, changeFrequency: "monthly", priority: 0.3 }];
}
