import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { collectionBySlug, prepOf } from "@/lib/collections";
import { collectionCounts, minForIndex, seoText } from "@/lib/collections-server";
import { ResultsPage } from "@/components/ResultsPage";

type P = { params: Promise<{ slug: string; filter: string }>; searchParams: Promise<Record<string, any>> };

async function load(slug: string, filter: string) {
  const c = collectionBySlug(filter);
  const r = c && await db.resort.findUnique({ where: { slug } });
  if (!c || !r || !r.isActive) return null;
  const prep = prepOf(r);
  const [seo, counts, min] = await Promise.all([seoText(r.id, filter), collectionCounts(r.id), minForIndex()]);
  const fill = (t: string) => t.replaceAll("{in}", prep).replaceAll("{resort}", r.name);
  const h1 = seo?.h1 ? fill(seo.h1) : c.h1(prep);
  const count = counts.find(x => x.slug === filter)!.count;
  return { c, r, seo, counts, h1, fill, index: count >= min };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug, filter } = await params;
  const d = await load(slug, filter);
  if (!d) return {};
  const s = await getSettings();
  return {
    title: d.seo?.seoTitle ? d.fill(d.seo.seoTitle) : String(s.collectionTitleTpl).replace("{h1}", d.h1),
    description: d.seo?.seoDescription ? d.fill(d.seo.seoDescription) : `${d.h1}. Объявления от хозяев с фото и ценами по месяцам. Звоните напрямую, без комиссии.`,
    alternates: { canonical: `/kurort/${slug}/${filter}` },
    robots: d.index ? undefined : { index: false, follow: true },
  };
}

export default async function CollectionPage({ params, searchParams }: P) {
  const { slug, filter } = await params;
  const d = await load(slug, filter);
  if (!d) notFound();
  return <ResultsPage title={d.h1} intro={d.seo?.text ? d.fill(d.seo.text) : null} scope={{ resort: slug, filter }} action={`/kurort/${slug}/${filter}`} sp={await searchParams} collections={d.counts} active={filter} />;
}
