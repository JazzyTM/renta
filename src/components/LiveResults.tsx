"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CardData } from "@/lib/card";
import { LISTING_TYPES } from "@/lib/labels";
import { plural, rub } from "@/lib/format";
import { ListingRow, RowSkeleton } from "./ListingCard";
import { PriceRange } from "./PriceRange";

type Hist = { min: number; max: number; bins: number[] };
type Res = { items: CardData[]; total: number; page: number; pages: number; hist?: Hist };
type F = { sea: string; pmin: string; price: string; type: string[]; amen: string[]; beach: string; verified: boolean; sort: string };

const SORTS: [string, string][] = [["rec", "Рекомендуем"], ["price", "Дешевле"], ["sea", "Ближе к морю"], ["rating", "Рейтинг"], ["new", "Новые"]];
const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []) as string[];

export function LiveResults({ title, scope, initial, sp, amenities, action, ci, co, guests, children, search }: {
  title: string; scope: { resort?: string; filter?: string }; initial: Res; sp: Record<string, any>; amenities: { code: string; name: string }[];
  action: string; ci?: string; co?: string; guests: number; children?: React.ReactNode; search?: React.ReactNode;
}) {
  const [f, setF] = useState<F>({ sea: sp.sea ?? "", pmin: sp.pmin ?? "", price: sp.price ?? "", type: arr(sp.type), amen: arr(sp.amen), beach: sp.beach ?? "", verified: sp.verified === "1", sort: sp.sort ?? "rec" });
  const [res, setRes] = useState<Res>(initial);
  const [hist] = useState<Hist | undefined>(initial.hist);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const [sheet, setSheet] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const first = useRef(true);
  const sentinel = useRef<HTMLDivElement>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (ci) p.set("ci", ci); if (co) p.set("co", co);
    for (const k of ["adults", "children"]) if (sp[k]) p.set(k, sp[k]);
    if (f.sea) p.set("sea", f.sea); if (f.pmin) p.set("pmin", f.pmin); if (f.price) p.set("price", f.price); if (f.beach) p.set("beach", f.beach);
    if (f.verified) p.set("verified", "1"); if (f.sort !== "rec") p.set("sort", f.sort);
    f.type.forEach(t => p.append("type", t)); f.amen.forEach(a => p.append("amen", a));
    return p;
  }, [f, ci, co, sp]);

  const load = useCallback(async (page: number) => {
    ctrl.current?.abort(); const c = new AbortController(); ctrl.current = c;
    const p = new URLSearchParams(qs); p.set("page", String(page));
    if (scope.resort) p.set("_resort", scope.resort); if (scope.filter) p.set("_filter", scope.filter);
    const r = await fetch(`/api/search?${p}`, { signal: c.signal }).then(r => r.json());
    return r as Res;
  }, [qs, scope]);

  // Фильтры поменялись: обновляем адрес страницы и результаты, без перезагрузки
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.history.replaceState(null, "", `${action}${qs.size ? "?" + qs : ""}`);
    setLoading(true);
    const t = setTimeout(() => load(1).then(r => { setRes(r); setLoading(false); }).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [qs, action, load]);

  // Подгрузка следующей страницы при прокрутке
  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || loading || more || res.page >= res.pages) return;
      setMore(true);
      try { const r = await load(res.page + 1); setRes(x => ({ ...r, items: [...x.items, ...r.items.filter(i => !x.items.some(y => y.id === i.id))] })); } catch {}
      setMore(false);
    }, { rootMargin: "600px" });
    io.observe(el); return () => io.disconnect();
  }, [res, loading, more, load]);

  const set = (patch: Partial<F>) => setF(x => ({ ...x, ...patch }));
  const toggle = (k: "type" | "amen", v: string) => setF(x => ({ ...x, [k]: x[k].includes(v) ? x[k].filter(y => y !== v) : [...x[k], v] }));
  const active = (f.sea ? 1 : 0) + (f.pmin || f.price ? 1 : 0) + f.type.length + f.amen.length + (f.beach ? 1 : 0) + (f.verified ? 1 : 0);
  const reset = () => setF({ sea: "", pmin: "", price: "", type: [], amen: [], beach: "", verified: false, sort: f.sort });
  const count = `${res.total} ${plural(res.total, ["вариант", "варианта", "вариантов"])}`;

  const filters = (
    <div className="filters" aria-label="Фильтры">
      {hist && hist.bins.length > 0 && <div className="fgroup"><span className="flabel">Цена за ночь</span>
        <PriceRange hist={hist} lo={Number(f.pmin) || hist.min} hi={Number(f.price) || hist.max} onChange={(lo, hi) => set({ pmin: lo > hist.min ? String(lo) : "", price: hi < hist.max ? String(hi) : "" })} /></div>}
      <div className="fgroup"><span className="flabel">До моря</span>
        <div className="chips">{[["", "Любое"], ["150", "до 150 м"], ["400", "до 400 м"], ["800", "до 800 м"], ["1500", "до 1,5 км"]].map(([v, t]) =>
          <button type="button" key={v} className={`chip ${f.sea === v ? "on" : ""}`} onClick={() => set({ sea: v })}>{t}</button>)}</div></div>
      <div className="fgroup"><span className="flabel">Тип жилья</span>
        <div className="chips">{Object.entries(LISTING_TYPES).map(([k, v]) => <button type="button" key={k} className={`chip ${f.type.includes(k) ? "on" : ""}`} onClick={() => toggle("type", k)}>{v}</button>)}</div></div>
      <div className="fgroup"><span className="flabel">Удобства</span>
        <div className="chips">{amenities.map(a => <button type="button" key={a.code} className={`chip ${f.amen.includes(a.code) ? "on" : ""}`} onClick={() => toggle("amen", a.code)}>{a.name}</button>)}</div></div>
      <div className="fgroup"><span className="flabel">Пляж</span>
        <div className="chips">{[["", "Любой"], ["PEBBLE", "Галька"], ["SAND", "Песок"], ["MIXED", "Песок и галька"]].map(([v, t]) =>
          <button type="button" key={v} className={`chip ${f.beach === v ? "on" : ""}`} onClick={() => set({ beach: v })}>{t}</button>)}</div></div>
      <label className="switch"><input type="checkbox" checked={f.verified} onChange={e => set({ verified: e.target.checked })} /><i /> Только проверенные</label>
      {active > 0 && <button type="button" className="link" onClick={reset}>Сбросить фильтры</button>}
    </div>
  );

  const QUICK: [string, string][] = [["breakfast", "Завтрак включён"], ["kids", "Для отдыха с детьми"], ["pets", "Можно с животными"]];
  const quick = QUICK.filter(([c]) => amenities.some(a => a.code === c));

  return (
    <>
      <div className="rtop"><div className="wrap">
        <h1 className="h2">{title}</h1>
        {search}
        <div className="qchips">
          <button type="button" className={`chip ico ${active ? "on" : ""}`} onClick={() => setSheet(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            Фильтры{active ? ` · ${active}` : ""}</button>
          <label className="chip ico sortchip">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <select value={f.sort} onChange={e => set({ sort: e.target.value })} aria-label="Сортировка">{SORTS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
          </label>
          {quick.map(([c, t]) => <button type="button" key={c} className={`chip ${f.amen.includes(c) ? "on" : ""}`} onClick={() => toggle("amen", c)}>{t}</button>)}
          <button type="button" className={`chip ${f.verified ? "on" : ""}`} onClick={() => set({ verified: !f.verified })}>Только проверенные</button>
        </div>
      </div></div>
      {sheet && <div className="modal-bg" onClick={() => setSheet(false)}><div className="modal sheet" onClick={e => e.stopPropagation()}>
        <button className="x" aria-label="Закрыть" onClick={() => setSheet(false)}>×</button><h2 className="h2">Фильтры</h2>{filters}
        <button className="btn wide" onClick={() => setSheet(false)}>Показать {count}</button></div></div>}
      <div className="rbody"><div className="wrap results2">
        <section>
          <p className="small muted rcount" aria-live="polite">{loading ? "Ищем…" : `Найдено: ${count}`}</p>
          <div className={`rows ${loading ? "dim" : ""}`}>
            {loading && !res.items.length ? Array.from({ length: 4 }, (_, i) => <RowSkeleton key={i} />) :
              res.items.map(l => <ListingRow key={l.id} l={l} ci={ci} co={co} guests={guests} />)}
            {more && Array.from({ length: 2 }, (_, i) => <RowSkeleton key={"m" + i} />)}
          </div>
          {!loading && !res.items.length && <div className="empty panel"><b>Ничего не нашлось</b><p className="muted">{active ? "Попробуйте убрать часть фильтров." : "Здесь пока нет объявлений. Загляните позже или посмотрите соседние курорты."}</p>{active > 0 && <button className="btn ghost" onClick={reset}>Сбросить фильтры</button>}</div>}
          <div ref={sentinel} style={{ height: 1 }} />
          {res.page >= res.pages && res.items.length > 6 && <p className="small muted" style={{ textAlign: "center", marginTop: 20 }}>Это все варианты{f.price ? ` до ${rub(Number(f.price))}` : ""}</p>}
        </section>
        <aside className="rside">{children}</aside>
      </div></div>
    </>
  );
}
