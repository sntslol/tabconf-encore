import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/moderate"] }, sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://savetabconf.com"}/sitemap.xml` };
}
