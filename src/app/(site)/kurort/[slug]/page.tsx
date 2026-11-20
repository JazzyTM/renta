import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ogMeta } from "@/lib/og";
import { prepOf } from "@/lib/collections";
import { collectionCounts } from "@/lib/collections-server";
import { ResultsPage } from "@/components/ResultsPage";
import { WeatherPanel } from "@/components/WeatherPanel";
import { RichText } from "@/components/RichText";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, any>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const [r, s] = await Promise.all([db.resort.findUnique({ where: { slug } }), getSettings()]);
  if (!r) return {};
  const title = r.seoTitle || String(s.resortTitleTpl).replace("{in}", prepOf(r)).replace("{resort}", r.name);
  return { title, description: r.seoDescription || undefined, alternates: { canonical: `/kurort/${slug}` },
    ...ogMeta({ title: `Жильё ${prepOf(r)} у моря`, description: r.seoDescription || `Гостевые дома, квартиры и номера ${prepOf(r)}: фото, цены по месяцам, отзывы. Звоните хозяевам напрямую, без комиссии.`, path: `/kurort/${slug}`, image: `/og/r/${slug}`, siteName: String(s.siteName) }) };
}

export default async function ResortPage({ params, searchParams }: P) {
  const { slug } = await params;
  const r = await db.resort.findUnique({ where: { slug }, include: { beaches: { take: 1 } } });
  if (!r || !r.isActive) notFound();
  const p = prepOf(r);
  const b = r.beaches[0];
  return <ResultsPage title={`Жильё ${p}`} intro={r.seoText} scope={{ resort: slug }} action={`/kurort/${slug}`} sp={await searchParams} collections={await collectionCounts(r.id)}
    aside={r.lat != null && r.lng != null && <WeatherPanel lat={r.lat} lng={r.lng} sea={b ? { lat: b.lat, lng: b.lng } : undefined} place={p} />}
    after={r.guide && <div className="wrap"><article className="panel prose-panel guide-panel"><h2>Гид по курорту</h2><RichText text={r.guide} /></article></div>} />;
}
