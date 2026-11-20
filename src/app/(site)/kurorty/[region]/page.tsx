import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { resortOptions } from "@/lib/queries";
import { regionAll, regionLabel } from "@/lib/regions";
import { plural } from "@/lib/format";
import { ResultsPage } from "@/components/ResultsPage";

type P = { params: Promise<{ region: string }>; searchParams: Promise<Record<string, any>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const g = await db.region.findUnique({ where: { slug: (await params).region } });
  if (!g) return {};
  return { title: `${regionLabel(g.name)}: жильё у моря без посредников`, alternates: { canonical: `/kurorty/${g.slug}` } };
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
