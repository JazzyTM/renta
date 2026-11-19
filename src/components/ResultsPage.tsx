import Link from "next/link";
import { db } from "@/lib/db";
import { resortOptions, searchListings, parseFilters, scopeWhere, priceHistogram } from "@/lib/queries";
import { toCard } from "@/lib/card";
import { SearchForm } from "./SearchForm";
import { RichText } from "./RichText";
import { LiveResults } from "./LiveResults";
import { getUser } from "@/lib/auth";
import { logSearch } from "@/lib/demand";
import { getSettings } from "@/lib/settings";

export async function ResultsPage({ title, intro, scope, action, sp, collections, active, aside, after }: {
  title: string; intro?: string | null; scope: { resort?: string; filter?: string }; action: string; sp: Record<string, any>;
  collections?: { slug: string; title: string; count: number }[]; active?: string; aside?: React.ReactNode; after?: React.ReactNode;
}) {
  const f = parseFilters(sp);
  const base = (await scopeWhere(scope))!;
  const [resorts, amenities, res, hist, user, beaches, s, rc] = await Promise.all([
    resortOptions(), db.amenity.findMany({ where: { isFilter: true }, orderBy: { sort: "asc" }, select: { code: true, name: true } }), searchListings(base, f), priceHistogram(base), getUser(),
    scope.resort ? db.beach.findMany({ where: { resort: { slug: scope.resort } }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
    getSettings(), scope.resort ? db.resort.findUnique({ where: { slug: scope.resort }, select: { lat: true, lng: true } }) : null,
  ]);
  const center = rc?.lat != null && rc?.lng != null ? [rc.lat, rc.lng] as [number, number] : undefined;
  if (f.page === 1) logSearch(scope.resort, f.ci, f.guests).catch(() => {});
  const initial = { items: res.items.map(toCard), total: res.total, page: res.page, pages: res.pages, hist };
  return (
    <main className="gray">
      <LiveResults title={title} scope={scope} initial={initial} sp={sp} amenities={amenities} action={action} ci={f.ci} co={f.co} guests={f.guests ?? 2} email={user?.email ?? undefined} beaches={beaches} mapKey={String(s.ymapsKey || "") || undefined} center={center}
        search={<SearchForm resorts={resorts} init={{ resort: scope.resort, ci: f.ci, co: f.co, adults: f.adults, children: f.children }} compact />}>
        {aside}
        {collections && collections.some(c => c.count > 0) && <nav className="panel colls2" aria-label="Подборки">
          <h2>Подборки</h2>
          <ul>
            {active && <li><Link href={`/kurort/${scope.resort}`}>Все варианты</Link></li>}
            {collections.filter(c => c.count > 0).map(c => <li key={c.slug}><Link className={active === c.slug ? "on" : ""} href={`/kurort/${scope.resort}/${c.slug}`}>{c.title}</Link> <span className="n">{c.count}</span></li>)}
          </ul>
        </nav>}
      </LiveResults>
      {after}
      {intro && <div className="wrap"><article className="panel prose-panel"><RichText text={intro} /></article></div>}
    </main>
  );
}
