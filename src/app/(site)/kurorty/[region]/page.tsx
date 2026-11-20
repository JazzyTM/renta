import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ogMeta } from "@/lib/og";
import { getSettings } from "@/lib/settings";
import { resortOptions } from "@/lib/queries";
import { regionAll, regionLabel } from "@/lib/regions";
import { plural } from "@/lib/format";
import { ResultsPage } from "@/components/ResultsPage";

type P = { params: Promise<{ region: string }>; searchParams: Promise<Record<string, any>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const g = await db.region.findUnique({ where: { slug: (await params).region } });
  if (!g) return {};
  const s = await getSettings();
  return { title: `${regionLabel(g.name)}: жильё у моря без посредников`, alternates: { canonical: `/kurorty/${g.slug}` },
    ...ogMeta({ title: `${regionAll(g.name)}: жильё у моря`, description: "Гостевые дома, квартиры и номера на всех курортах региона. Фото, цены по месяцам, звоните хозяевам напрямую.", path: `/kurorty/${g.slug}`, image: `/og/g/${g.slug}`, siteName: String(s.siteName) }) };
}

// Выдача по всему региону: все курорты Крыма, Азовского моря и т.д.
export default async function RegionPage({ params, searchParams }: P) {
  const { region } = await params;
  const g = await db.region.findUnique({ where: { slug: region } });
  if (!g || !g.isActive) notFound();
  const resorts = (await resortOptions()).filter(r => r.regionSlug === g.slug);
  return <ResultsPage title={`${regionAll(g.name)}: жильё`} scope={{ region }} action={`/kurorty/${region}`} sp={await searchParams}
    aside={<nav className="panel colls2" aria-label="Курорты региона">
      <h2>Курорты</h2>
      <ul>{resorts.map(r => <li key={r.slug}><Link href={`/kurort/${r.slug}`}>{r.name}</Link>{r.count ? <> <span className="n">{r.count}</span></> : null}</li>)}</ul>
      <p className="small muted" style={{ marginTop: 8 }}>{resorts.length} {plural(resorts.length, ["курорт", "курорта", "курортов"])}</p>
    </nav>} />;
}
