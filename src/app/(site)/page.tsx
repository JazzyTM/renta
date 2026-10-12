import { toCard } from "@/lib/card";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { resortOptions, visibleWhere, cardInclude } from "@/lib/queries";
import { SearchForm } from "@/components/SearchForm";
import { ListingCard } from "@/components/ListingCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [s, resorts, where] = await Promise.all([getSettings(), resortOptions(), visibleWhere()]);
  const [popular, regions, featured, banners] = await Promise.all([
    db.resort.findMany({ where: { isPopular: true, isActive: true }, orderBy: { sort: "asc" } }),
    db.region.findMany({ where: { isActive: true }, orderBy: { sort: "asc" }, include: { resorts: { where: { isActive: true }, orderBy: { sort: "asc" } } } }),
    db.listing.findMany({ where, include: cardInclude, orderBy: [{ isFeatured: "desc" }, { boostedAt: { sort: "desc", nulls: "last" } }, { ratingAvg: "desc" }], take: 8 }),
    db.banner.findMany({ where: { isActive: true, place: "home" }, orderBy: { sort: "asc" } }),
  ]);
  return (
    <main>
      <section className="hero"><div className="wrap">
        <h1>{s.tagline}</h1>
        <p className="lead">{s.subTagline}</p>
        <SearchForm resorts={resorts} init={{}} />
        <div className="row"><span className="small muted">Часто ищут:</span>{popular.map(r => <Link key={r.id} className="chip" href={`/kurort/${r.slug}`}>{r.name}</Link>)}</div>
      </div></section>
      {banners.map(b => <div key={b.id} className="wrap" style={{ marginTop: 20 }}><div className="notice"><b>{b.title}</b> {b.text} {b.link && <Link href={b.link}>Подробнее</Link>}</div></div>)}
      {featured.length > 0 && <section className="section"><div className="wrap">
        <div className="row between" style={{ marginBottom: 18 }}><h2 className="h2">Популярное этим летом</h2><Link className="link" href="/search">Смотреть все</Link></div>
        <div className="cards">{featured.map(l => <ListingCard key={l.id} l={toCard(l)} />)}</div>
      </div></section>}
      <section className="section"><div className="wrap">
        <h2 className="h2" style={{ marginBottom: 18 }}>Все курорты</h2>
        <div className="regions">{regions.map(r => <section key={r.id}><h3>{r.name}</h3><ul>{r.resorts.map(x => <li key={x.id}><Link href={`/kurort/${x.slug}`}>{x.name}</Link></li>)}</ul></section>)}</div>
      </div></section>
    </main>
  );
}
