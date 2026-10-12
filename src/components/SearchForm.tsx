"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DateRange, Guests } from "./DateRange";

export type ResortOpt = { name: string; slug: string; region: string };

export function SearchForm({ resorts, init }: { resorts: ResortOpt[]; init: { resort?: string; ci?: string; co?: string; adults?: number; children?: number } }) {
  const router = useRouter();
  const initial = resorts.find(r => r.slug === init.resort);
  const [q, setQ] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [show, setShow] = useState(false);
  const [ci, setCi] = useState(init.ci ?? "");
  const [co, setCo] = useState(init.co ?? "");
  const [adults, setAdults] = useState(init.adults ?? 2);
  const [children, setChildren] = useState(init.children ?? 0);
  const matches = useMemo(() => { const v = q.trim().toLowerCase(); return resorts.filter(r => !v || r.name.toLowerCase().includes(v)).slice(0, 8); }, [q, resorts]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = slug || resorts.find(x => x.name.toLowerCase() === q.trim().toLowerCase())?.slug || (q.trim() ? matches[0]?.slug : "");
    const p = new URLSearchParams();
    if (ci) p.set("ci", ci); if (co) p.set("co", co);
    if (adults !== 2) p.set("adults", String(adults)); if (children) p.set("children", String(children));
    router.push(r ? `/kurort/${r}${p.size ? "?" + p : ""}` : `/search${p.size ? "?" + p : ""}`);
  }

  return (
    <form className="search" onSubmit={submit} autoComplete="off">
      <div className="field"><label htmlFor="s-resort">Курорт</label>
        <input className="input" id="s-resort" value={q} placeholder="Например, Анапа или Ялта"
          onChange={e => { setQ(e.target.value); setSlug(""); setShow(true); }} onFocus={() => setShow(true)} onBlur={() => setTimeout(() => setShow(false), 150)} />
        {show && (
          <div className="sugg">
            {matches.length ? matches.map(r => (
              <button type="button" key={r.slug} onMouseDown={() => { setQ(r.name); setSlug(r.slug); setShow(false); }}>
                <span>{r.name}</span><span className="small muted">{r.region}</span></button>
            )) : <div className="small muted" style={{ padding: 8 }}>Такого курорта пока нет</div>}
          </div>
        )}
      </div>
      <DateRange ci={ci} co={co} onChange={(a, b) => { setCi(a); setCo(b); }} />
      <Guests adults={adults} children={children} onChange={(a, c) => { setAdults(a); setChildren(c); }} />
      <button className="btn" type="submit">Найти</button>
    </form>
  );
}
