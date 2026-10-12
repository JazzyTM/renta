import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ResultsPage } from "@/components/ResultsPage";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, any>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const [r, s] = await Promise.all([db.resort.findUnique({ where: { slug } }), getSettings()]);
  if (!r) return {};
  return { title: r.seoTitle || String(s.resortTitleTpl).replace("{resort}", r.name), description: r.seoDescription || undefined, alternates: { canonical: `/kurort/${slug}` } };
}

export default async function ResortPage({ params, searchParams }: P) {
  const { slug } = await params;
  const r = await db.resort.findUnique({ where: { slug } });
  if (!r || !r.isActive) notFound();
  return <ResultsPage title={`Жильё в ${r.name}`} intro={r.seoText} base={{ resortId: r.id }} action={`/kurort/${slug}`} sp={await searchParams} resortSlug={slug} />;
}
