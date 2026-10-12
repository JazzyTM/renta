"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { DateRange, Guests } from "./DateRange";
import { plural } from "@/lib/format";

export type ResortOpt = { name: string; slug: string; region: string; count?: number; popular?: boolean };

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]/g, "");

export function SearchForm({ resorts, init, compact }: { resorts: ResortOpt[]; init: { resort?: string; ci?: string; co?: string; adults?: number; children?: number }; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const initial = resorts.find(r => r.slug === init.resort);
  const [q, setQ] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [show, setShow] = useState(false);
  const [act, setAct] = useState(0);
  const [ci, setCi] = useState(init.ci ?? "");
  const [co, setCo] = useState(init.co ?? "");
  const [adults, setAdults] = useState(init.adults ?? 2);
  const [children, setChildren] = useState(init.children ?? 0);
  // Подсказки: совпадение с начала слова выше, затем по числу объявлений; без ввода — популярные
  const matches = useMemo(() => {
    const v = norm(q.trim());
    if (!v || (slug && initial?.name === q)) return resorts.filter(r => r.popular).sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 8);
    return resorts.map(r => { const n = norm(r.name); const i = n.indexOf(v); return { r, s: i < 0 ? (norm(r.region).includes(v) ? 3 : -1) : i === 0 ? 0 : 1 }; })
      .filter(x => x.s >= 0).sort((a, b) => a.s - b.s || (b.r.count ?? 0) - (a.r.count ?? 0)).slice(0, 8).map(x => x.r);
  }, [q, resorts, slug, initial]);

  function pick(r: ResortOpt) { setQ(r.name); setSlug(r.slug); setShow(false); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = slug || resorts.find(x => norm(x.name) === norm(q.trim()))?.slug || (q.trim() ? matches[0]?.slug : "");
    const p = new URLSearchParams();
    if (ci) p.set("ci", ci); if (co) p.set("co", co);
    if (adults !== 2) p.set("adults", String(adults)); if (children) p.set("children", String(children));
    const url = r ? `/kurort/${r}${p.size ? "?" + p : ""}` : `/search${p.size ? "?" + p : ""}`;
    setShow(false);
    start(() => { if (location.pathname + location.search === url) router.refresh(); else router.push(url); });
  }

  return (
    <form className={`search ${compact ? "compact" : ""}`} onSubmit={submit} autoComplete="off" role="search">
      <div className="field"><label htmlFor="s-resort">Курорт</label>
        <input className="input" id="s-resort" value={q} placeholder="Анапа, Сочи, Ялта…" role="combobox" aria-expanded={show} aria-controls="s-sugg"
          onChange={e => { setQ(e.target.value); setSlug(""); setShow(true); setAct(0); }} onFocus={e => { setShow(true); e.target.select(); }} onBlur={() => setTimeout(() => setShow(false), 150)}
          onKeyDown={e => {
            if (!show || !matches.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setAct(a => (a + 1) % matches.length); }
            if (e.key === "ArrowUp") { e.preventDefault(); setAct(a => (a - 1 + matches.length) % matches.length); }
            if (e.key === "Enter" && !slug) { e.preventDefault(); pick(matches[act]); }
            if (e.key === "Escape") setShow(false);
          }} />
        {show && (
          <div className="sugg" id="s-sugg" role="listbox">
            {!q.trim() && <div className="sugg-h">Популярные</div>}
            {matches.length ? matches.map((r, i) => (
              <button type="button" role="option" aria-selected={i === act} className={i === act ? "act" : ""} key={r.slug} onMouseDown={() => pick(r)} onMouseEnter={() => setAct(i)}>
                <span><b>{r.name}</b><span className="small muted"> · {r.region}</span></span>
                <span className="small muted">{r.count ? `${r.count} ${plural(r.count, ["объект", "объекта", "объектов"])}` : ""}</span></button>
            )) : <div className="small muted" style={{ padding: 10 }}>Такого курорта пока нет</div>}
          </div>
        )}
      </div>
      <DateRange ci={ci} co={co} onChange={(a, b) => { setCi(a); setCo(b); }} />
      <Guests adults={adults} children={children} onChange={(a, c) => { setAdults(a); setChildren(c); }} />
      <button className="btn" type="submit" disabled={pending}>{pending ? <><span className="spin" /> Ищем</> : "Найти"}</button>
    </form>
  );
}
