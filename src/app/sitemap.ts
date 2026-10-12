import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { visibleWhere } from "@/lib/queries";
import { collectionCounts, minForIndex } from "@/lib/collections-server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const [resorts, listings, pages, articles] = await Promise.all([
    db.resort.findMany({ where: { isActive: true }, select: { slug: true, id: true } }),
    db.listing.findMany({ where: await visibleWhere(), select: { number: true, updatedAt: true } }),
    db.page.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    db.article.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const min = await minForIndex();
  const collections = (await Promise.all(resorts.map(async r => (await collectionCounts(r.id)).filter(c => c.count >= min).map(c => `${base}/kurort/${r.slug}/${c.slug}`)))).flat();
  return [
    { url: base + "/", changeFrequency: "daily", priority: 1 },
    ...resorts.map(r => ({ url: `${base}/kurort/${r.slug}`, changeFrequency: "daily" as const, priority: 0.9 })),
    ...collections.map(url => ({ url, changeFrequency: "daily" as const, priority: 0.8 })),
    ...listings.map(l => ({ url: `${base}/obj/${l.number}`, lastModified: l.updatedAt, priority: 0.7 })),
    { url: base + "/articles", changeFrequency: "weekly" },
    ...articles.map(a => ({ url: `${base}/articles/${a.slug}`, lastModified: a.updatedAt, priority: 0.5 })),
    ...pages.map(p => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, priority: 0.3 })),
  ];
}
