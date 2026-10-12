import Link from "next/link";
import { db } from "@/lib/db";
import { plural } from "@/lib/format";
import { resortOptions, searchListings, parseFilters } from "@/lib/queries";
import type { Prisma } from "@/generated/prisma/client";
import { SearchForm } from "./SearchForm";
import { ListingCard } from "./ListingCard";
import { RichText } from "./RichText";
import { Filters } from "./Filters";

export async function ResultsPage({ title, intro, base, action, sp, resortSlug }: { title: string; intro?: string | null; base: Prisma.ListingWhereInput; action: string; sp: Record<string, any>; resortSlug?: string }) {
  const f = parseFilters(sp);
  const [resorts, amenities, res] = await Promise.all([
    resortOptions(), db.amenity.findMany({ where: { isFilter: true }, orderBy: { sort: "asc" } }), searchListings(base, f),
  ]);
  const link = (patch: Record<string, string>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : [v]) if (x) p.append(k, x); for (const [k, v] of Object.entries(patch)) p.set(k, v); return `${action}?${p}`; };
  return (
    <main>
      <div style={{ background: "var(--surface-2)", paddingBlock: 14 }}><div className="wrap"><SearchForm resorts={resorts} init={{ resort: resortSlug, ci: f.ci, co: f.co, adults: f.adults, children: f.children }} /></div></div>
      <div className="wrap"><div className="results">
        <Filters action={action} sp={sp} amenities={amenities} />
        <section>
          <div className="row between" style={{ marginBottom: 14, alignItems: "flex-end" }}>
            <div><h1 className="h2">{title}</h1><p className="small muted">{res.total} {plural(res.total, ["вариант", "варианта", "вариантов"])}</p></div>
            <div className="row small">{[["rec", "Рекомендуем"], ["price", "Дешевле"], ["sea", "Ближе к морю"], ["rating", "Рейтинг"], ["new", "Новые"]].map(([k, t]) =>
              <Link key={k} className={`chip ${f.sort === k ? "on" : ""}`} href={link({ sort: k, page: "1" })}>{t}</Link>)}</div>
          </div>
          {res.items.length ? <div className="rlist">{res.items.map(l => <ListingCard key={l.id} l={l} ci={f.ci} co={f.co} guests={f.guests} />)}</div>
            : <div className="card-box">По этим условиям ничего не нашлось. Попробуйте убрать часть фильтров.</div>}
          {res.pages > 1 && <nav className="pager" aria-label="Страницы">{Array.from({ length: res.pages }, (_, i) => i + 1).map(n =>
            <Link key={n} className={`chip ${n === res.page ? "on" : ""}`} href={link({ page: String(n) })}>{n}</Link>)}</nav>}
          {intro && <article className="card-box" style={{ marginTop: 28 }}><RichText text={intro} /></article>}
        </section>
      </div></div>
    </main>
  );
}
