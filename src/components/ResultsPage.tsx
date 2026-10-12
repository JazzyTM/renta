import Link from "next/link";
import { db } from "@/lib/db";
import { resortOptions, searchListings, parseFilters, scopeWhere, priceHistogram } from "@/lib/queries";
import { toCard } from "@/lib/card";
import { SearchForm } from "./SearchForm";
import { RichText } from "./RichText";
import { LiveResults } from "./LiveResults";

export async function ResultsPage({ title, intro, scope, action, sp, collections, active }: {
  title: string; intro?: string | null; scope: { resort?: string; filter?: string }; action: string; sp: Record<string, any>;
  collections?: { slug: string; title: string; count: number }[]; active?: string;
}) {
  const f = parseFilters(sp);
  const base = (await scopeWhere(scope))!;
  const [resorts, amenities, res, hist] = await Promise.all([
    resortOptions(), db.amenity.findMany({ where: { isFilter: true }, orderBy: { sort: "asc" }, select: { code: true, name: true } }), searchListings(base, f), priceHistogram(base),
  ]);
  const initial = { items: res.items.map(toCard), total: res.total, page: res.page, pages: res.pages, hist };
  return (
    <main className="gray">
      <LiveResults title={title} scope={scope} initial={initial} sp={sp} amenities={amenities} action={action} ci={f.ci} co={f.co} guests={f.guests ?? 2}
        search={<SearchForm resorts={resorts} init={{ resort: scope.resort, ci: f.ci, co: f.co, adults: f.adults, children: f.children }} compact />}>
        {collections && collections.some(c => c.count > 0) && <nav className="panel colls2" aria-label="Подборки">
          <h2>Подборки</h2>
          <ul>
            {active && <li><Link href={`/kurort/${scope.resort}`}>Все варианты</Link></li>}
            {collections.filter(c => c.count > 0).map(c => <li key={c.slug}><Link className={active === c.slug ? "on" : ""} href={`/kurort/${scope.resort}/${c.slug}`}>{c.title}</Link> <span className="n">{c.count}</span></li>)}
          </ul>
        </nav>}
      </LiveResults>
      {intro && <div className="wrap"><article className="panel prose-panel"><RichText text={intro} /></article></div>}
    </main>
  );
}
