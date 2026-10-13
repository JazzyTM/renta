import { toCard } from "@/lib/card";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { resortOptions, visibleWhere, cardInclude } from "@/lib/queries";
import { fmtDate } from "@/lib/format";
import { SearchForm } from "@/components/SearchForm";
import { ListingCard } from "@/components/ListingCard";
import { RichText } from "@/components/RichText";
import { ShowMore, Tabs } from "@/components/ShowMore";
import { HeroArt, SceneArt, OwnersArt } from "@/components/Art";

export const dynamic = "force-dynamic";

const ICONS = [
  "M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.7-.9 2.8.9 2.8-2.4 1.7-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.5l.9-2.8-.9-2.8 2.4-1.7 1-2.8 2.9.2zM8.5 12l2.5 2.5 4.5-5",
  "M2 12l4-4 4 2 4-3 4 3 4 2-4 4M7 13l3 3M10 12l4 4M13 11l4 4M2 12l4 4",
  "M3 21V10l6-4 6 4v11M15 21V7h6v14M7 13h4M7 17h4M18 11h.01M18 15h.01",
];

// Группы для вкладок «Все курорты»
const tabOf = (name: string) => /крым/i.test(name) ? "Курорты Крыма" : /абхаз/i.test(name) ? "Курорты Абхазии" : "Краснодарский край и Азов";

export default async function Home() {
  const [s, resorts, where] = await Promise.all([getSettings(), resortOptions(), visibleWhere()]);
  const [popular, regions, latest, articles, banners, total] = await Promise.all([
    db.resort.findMany({ where: { isPopular: true, isActive: true }, orderBy: { sort: "asc" }, include: { region: true } }),
    db.region.findMany({ where: { isActive: true }, orderBy: { sort: "asc" }, include: { resorts: { where: { isActive: true }, orderBy: { name: "asc" } } } }),
    db.listing.findMany({ where, include: cardInclude, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], take: 12 }),
    db.article.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" }, take: 6 }),
    db.banner.findMany({ where: { isActive: true, place: "home" }, orderBy: { sort: "asc" } }),
    db.listing.count({ where }),
  ]);
  const counts = new Map(resorts.map(r => [r.slug, r.count ?? 0]));
  const features = [1, 2, 3].map(i => ({ title: s[`feature${i}Title`], text: String(s[`feature${i}Text`] ?? "").replace("{count}", total.toLocaleString("ru-RU")) })).filter(f => f.title);
  const tabs = [...new Set(regions.map(r => tabOf(r.name)))].map(title => ({
    title, body: <div className="allres">{regions.filter(r => tabOf(r.name) === title).map(r => <section key={r.id}><h3>{r.name}</h3><ul>{r.resorts.map(x => <li key={x.id}><Link href={`/kurort/${x.slug}`}>{x.name}</Link> <span className="n">{counts.get(x.slug) ?? 0}</span></li>)}</ul></section>)}</div>,
  }));

  return (
    <main className="home">
      <section className={`hero ${s.heroImage ? "img" : ""}`} style={s.heroImage ? { backgroundImage: `url(${s.heroImage})` } : undefined}>
        {!s.heroImage && <HeroArt />}
        <div className="wrap">
          <h1>{s.tagline}</h1>
          <SearchForm resorts={resorts} init={{}} />
        </div>
      </section>
      <div className="sheet-top">
        {banners.map(b => <div key={b.id} className="wrap" style={{ paddingTop: 20 }}><div className="notice"><b>{b.title}</b> {b.text} {b.link && <Link href={b.link}>Подробнее</Link>}</div></div>)}
        {s.featuresShow && features.length > 0 && <section className="hsec"><div className="wrap">
          <h2 className="h2">Почему ищут жильё у нас</h2>
          <div className="feats">{features.map((f, i) => <div key={i} className="feat"><div><b>{f.title}</b><p>{f.text}</p></div>
            <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path d={ICONS[i]} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>)}</div>
        </div></section>}
        {s.bannerShow && <section className="hsec"><div className="wrap">
          <div className={`owners ${s.bannerImage ? "img" : ""}`} style={s.bannerImage ? { backgroundImage: `url(${s.bannerImage})` } : undefined}>
            {!s.bannerImage && <OwnersArt />}
            <h2>{s.bannerTitle}</h2><p>{s.bannerText}</p><Link className="btn" href="/cabinet/new">Добавить объект</Link>
          </div>
        </div></section>}
        {popular.length > 0 && <section className="hsec"><div className="wrap">
          <h2 className="h2">Популярные курорты</h2>
          <ShowMore className="rtiles" limit={6}>{popular.map(r => (
            <Link key={r.id} href={`/kurort/${r.slug}`} className={`rtile ${r.coverUrl ? "" : "noimg"}`} style={r.coverUrl ? { backgroundImage: `url(${r.coverUrl})` } : undefined}>
              {!r.coverUrl && <SceneArt seed={r.slug} />}<b>{r.name}</b><span>{r.region.name}</span>
            </Link>))}</ShowMore>
        </div></section>}
      </div>
      {latest.length > 0 && <section className="hsec"><div className="wrap">
        <h2 className="h2">Последние добавленные объекты</h2>
        <div className="cards strip">{latest.map(l => <ListingCard key={l.id} l={toCard(l)} />)}</div>
      </div></section>}
      {articles.length > 0 && <section className="hsec"><div className="wrap">
        <h2 className="h2">Статьи об отдыхе</h2>
        <div className="arts">{articles.map(a => <Link key={a.id} href={`/articles/${a.slug}`} className="art">
          <div className="aph">{a.coverUrl ? <img src={a.coverUrl} alt="" loading="lazy" /> : <SceneArt seed={a.slug} />}</div>
          <div className="atx"><b>{a.title}</b>{a.excerpt && <p>{a.excerpt}</p>}<span className="small muted">{fmtDate(a.publishedAt ?? a.createdAt)}</span></div>
        </Link>)}</div>
        <Link className="btn gray wide more" href="/articles">Читать больше статей</Link>
      </div></section>}
      <section className="hsec"><div className="wrap">
        <h2 className="h2">Все курорты Чёрного и Азовского моря</h2>
        {tabs.length > 1 ? <Tabs tabs={tabs} /> : tabs[0]?.body}
      </div></section>
      {s.homeSeoText && <section className="hsec"><div className="wrap"><RichText text={s.homeSeoText} className="prose seo" /></div></section>}
    </main>
  );
}
