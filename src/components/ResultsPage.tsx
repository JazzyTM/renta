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
    <main>
      <div className="sbar"><div className="wrap"><SearchForm resorts={resorts} init={{ resort: scope.resort, ci: f.ci, co: f.co, adults: f.adults, children: f.children }} compact /></div></div>
      <div className="wrap">
        <LiveResults title={title} scope={scope} initial={initial} sp={sp} amenities={amenities} action={action} ci={f.ci} co={f.co} guests={f.guests ?? 2}>
          {collections && collections.some(c => c.count > 0) && <nav className="colls" aria-label="Подборки">
            {active && <Link className="chip" href={`/kurort/${scope.resort}`}>Все варианты</Link>}
            {collections.filter(c => c.count > 0).map(c => <Link key={c.slug} className={`chip ${active === c.slug ? "on" : ""}`} href={`/kurort/${scope.resort}/${c.slug}`}>{c.title} <span className="muted">{c.count}</span></Link>)}
          </nav>}
        </LiveResults>
        {intro && <article className="card-box" style={{ marginBottom: 48 }}><RichText text={intro} /></article>}
      </div>
    </main>
  );
}
