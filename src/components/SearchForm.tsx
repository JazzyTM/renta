"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { DateRange, Guests } from "./DateRange";
import { plural } from "@/lib/format";
import { useAB, abGoal } from "./AB";

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
  const label = useAB("search_button", "Узнать цены");
  // Подсказки: совпадение с начала слова выше, затем по числу объявлений; без ввода — популярные
  const matches = useMemo(() => {
    const v = norm(q.trim());
    if (!v || (slug && initial?.name === q)) return resorts.filter(r => r.popular).sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 8);
    return resorts.map(r => { const n = norm(r.name); const i = n.indexOf(v); return { r, s: i < 0 ? (norm(r.region).includes(v) ? 3 : -1) : i === 0 ? 0 : 1 }; })
      .filter(x => x.s >= 0).sort((a, b) => a.s - b.s || (b.r.count ?? 0) - (a.r.count ?? 0)).slice(0, 8).map(x => x.r);
  }, [q, resorts, slug, initial]);

  // Голосовой поиск (Chrome, Яндекс Браузер, Edge): говорим название курорта
  const [canVoice, setCanVoice] = useState(false);
  const [listening, setListening] = useState(false);
  useEffect(() => { setCanVoice(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)); }, []);
  function voice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SR) return;
    const r = new SR(); r.lang = "ru-RU"; r.interimResults = false; r.maxAlternatives = 3;
    r.onresult = (e: any) => {
      const alts: string[] = Array.from(e.results[0]).map((a: any) => a.transcript);
      const hit = alts.map(t => resorts.find(x => norm(t).includes(norm(x.name)))).find(Boolean);
      if (hit) pick(hit); else { setQ(alts[0] ?? ""); setSlug(""); setShow(true); }
    };
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    setListening(true); r.start();
  }

  function pick(r: ResortOpt) { setQ(r.name); setSlug(r.slug); setShow(false); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = slug || resorts.find(x => norm(x.name) === norm(q.trim()))?.slug || (q.trim() ? matches[0]?.slug : "");
    const p = new URLSearchParams();
    if (ci) p.set("ci", ci); if (co) p.set("co", co);
    if (adults !== 2) p.set("adults", String(adults)); if (children) p.set("children", String(children));
    const url = r ? `/kurort/${r}${p.size ? "?" + p : ""}` : `/search${p.size ? "?" + p : ""}`;
    setShow(false); abGoal("search");
    start(() => { if (location.pathname + location.search === url) router.refresh(); else router.push(url); });
  }

  return (
    <form className={`search ${compact ? "compact" : ""}`} onSubmit={submit} autoComplete="off" role="search">
      <div className="field seg-resort"><label htmlFor="s-resort" className="sr">Курорт</label>
        <input className="input seg" id="s-resort" value={q} placeholder="Название курорта" role="combobox" aria-expanded={show} aria-controls="s-sugg"
          onChange={e => { setQ(e.target.value); setSlug(""); setShow(true); setAct(0); }} onFocus={e => { setShow(true); e.target.select(); }} onBlur={() => setTimeout(() => setShow(false), 150)}
          onKeyDown={e => {
            if (!show || !matches.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setAct(a => (a + 1) % matches.length); }
            if (e.key === "ArrowUp") { e.preventDefault(); setAct(a => (a - 1 + matches.length) % matches.length); }
            if (e.key === "Enter" && !slug) { e.preventDefault(); pick(matches[act]); }
            if (e.key === "Escape") setShow(false);
          }} />
        {canVoice && !q && <button type="button" className={`mic ${listening ? "on" : ""}`} aria-label="Сказать название курорта" title="Голосовой поиск" onClick={voice}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3zM5 11a7 7 0 0014 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>}
        {q && <button type="button" className="clr" aria-label="Очистить" onMouseDown={e => { e.preventDefault(); setQ(""); setSlug(""); setShow(true); }}>×</button>}
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
      <DateRange single ci={ci} co={co} onChange={(a, b) => { setCi(a); setCo(b); }} />
      <Guests bare adults={adults} children={children} onChange={(a, c) => { setAdults(a); setChildren(c); }} />
      <button className="btn" type="submit" disabled={pending}>{pending ? <><span className="spin" /> Ищем</> : label}</button>
    </form>
  );
}
