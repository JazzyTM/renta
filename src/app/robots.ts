import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSettings();
  const base = process.env.APP_URL || "http://localhost:3000";
  const extra = String(s.robotsExtra || "").split("\n").map(l => l.trim()).filter(l => /^disallow:/i.test(l)).map(l => l.slice(9).trim());
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/cabinet", "/account", "/my", "/b/", "/auth/", "/login", "/register", "/search?", ...extra] },
    sitemap: `${base}/sitemap.xml`,
  };
}
