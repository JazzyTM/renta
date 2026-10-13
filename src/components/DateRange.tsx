"use client";
import { useEffect, useRef, useState } from "react";

const MG = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const MN = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const WD = ["вс","пн","вт","ср","чт","пт","сб"];
const D = (s: string) => Date.parse(s + "T00:00:00Z");
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const MS = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const short = (s: string) => { const d = new Date(D(s)); return `${d.getUTCDate()} ${MS[d.getUTCMonth()]}`; };
const nightsWord = (n: number) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? "ночь" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "ночи" : "ночей"; };
const Chev = () => <svg className="chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const label = (s: string) => { const d = new Date(D(s)); return `${d.getUTCDate()} ${MG[d.getUTCMonth()]}, ${WD[d.getUTCDay()]}`; };

export function DateRange({ ci, co, onChange, alignRight, single, prices, busy }: { ci: string; co: string; onChange: (ci: string, co: string) => void; alignRight?: boolean; single?: boolean; prices?: { month: number; price: number }[]; busy?: string[] }) {
  const busySet = new Set(busy ?? []);
  const priceIn = (m: number) => prices?.find(p => p.month === m + 1)?.price ?? 0;
  const kfmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0).replace(".", ",")}к` : String(n);
  const [open, setOpen] = useState<null | "ci" | "co">(null);
  const today = iso(Date.now() - (Date.now() % 86400000));
  const start = new Date(D(ci || today));
  const [month, setMonth] = useState<[number, number]>([start.getUTCFullYear(), start.getUTCMonth()]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);

  function pick(d: string) {
    if (open === "ci" || !ci || D(d) <= D(ci)) { onChange(d, ""); setOpen("co"); return; }
    onChange(ci, d); setOpen(null);
  }
  function shift(n: number) { let [y, m] = month; m += n; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setMonth([y, m]); }
  const nowM = new Date(D(today));
  const atStart = month[0] < nowM.getUTCFullYear() || (month[0] === nowM.getUTCFullYear() && month[1] <= nowM.getUTCMonth());
  const nights = ci && co ? Math.round((D(co) - D(ci)) / 86400000) : 0;

  function Month({ y, m }: { y: number; m: number }) {
    const first = Date.UTC(y, m, 1), days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), off = (new Date(first).getUTCDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < off; i++) cells.push(<div key={"e" + i} />);
    for (let d = 1; d <= days; d++) {
      const s = iso(Date.UTC(y, m, d));
      const edge = s === ci || s === co, inr = ci && co && D(s) > D(ci) && D(s) < D(co);
      const isBusy = busySet.has(s), pr = prices ? priceIn(m) : 0;
      cells.push(<button type="button" key={s} className={`day ${edge ? "edge" : inr ? "inr" : ""} ${isBusy ? "busy" : ""} ${prices ? "wp" : ""}`} disabled={D(s) < D(today) || (isBusy && open === "ci")} onClick={() => pick(s)} aria-label={`${label(s)}${isBusy ? ", занято" : pr ? `, ${pr} ₽` : ""}`}>
        {d}{prices && <small>{isBusy ? "занято" : pr ? kfmt(pr) : "—"}</small>}</button>);
    }
    return (
      <div><h3 style={{ fontSize: 15, marginBottom: 8 }}>{MN[m]} {y}</h3>
        <div className="calgrid">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(w => <div className="wd" key={w}>{w}</div>)}{cells}</div></div>
    );
  }

  const btn = (k: "ci" | "co", t: string) => (
    <div className="field"><span className="flabel">{t}</span>
      <button type="button" className={`input dbtn ${open === k ? "on" : ""} ${(k === "ci" ? ci : co) ? "" : "unset"}`} onClick={() => setOpen(k === "co" && !ci ? "ci" : k)}>
        {(k === "ci" ? ci : co) ? label(k === "ci" ? ci : co) : "Выберите дату"}
      </button></div>
  );
  const [y2, m2] = month[1] === 11 ? [month[0] + 1, 0] : [month[0], month[1] + 1];
  return (
    <div className={`f-dates ${single ? "one" : ""}`} ref={ref}>
      {single ? (
        <button type="button" className={`input dbtn seg ${open ? "on" : ""} ${ci ? "" : "unset"}`} onClick={() => setOpen(open ? null : ci && !co ? "co" : "ci")} aria-label="Даты заезда и выезда">
          <span>{ci ? <>{short(ci)} – {co ? <>{short(co)}, {nights} {nightsWord(nights)}</> : "выезд?"}</> : "Даты заезда и выезда"}</span><Chev />
        </button>
      ) : <>{btn("ci", "Заезд")}{btn("co", "Выезд")}</>}
      {open && (
        <div className={`dp ${alignRight ? "right" : ""}`} role="dialog" aria-label="Выбор дат">
          <div className="dphead"><button type="button" onClick={() => shift(-1)} disabled={atStart} aria-label="Назад">‹</button>
            <b className="small">{open === "ci" ? "Дата заезда" : "Дата выезда"}</b>
            <button type="button" onClick={() => shift(1)} aria-label="Вперёд">›</button></div>
          <div className="dpm"><Month y={month[0]} m={month[1]} /><Month y={y2} m={m2} /></div>
          <div className="dpfoot"><span className="small muted num">{nights ? `${nights} ноч.` : ""}</span><button type="button" className="btn sm" onClick={() => setOpen(null)}>Готово</button></div>
        </div>
      )}
    </div>
  );
}

export function Guests({ adults, children, onChange, bare }: { adults: number; children: number; onChange: (a: number, c: number) => void; bare?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false; };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const lbl = bare ? `${adults} ${adults === 1 ? "взрослый" : "взрослых"}${children ? `, ${children} ${children === 1 ? "ребёнок" : children < 5 ? "ребёнка" : "детей"}` : ""}` : `${adults} взр.${children ? `, ${children} дет.` : ""}`;
  const Step = ({ t, v, set, min }: { t: string; v: number; set: (n: number) => void; min: number }) => (
    <div className="step"><b>{t}</b><div className="ctl">
      <button type="button" onClick={() => set(Math.max(min, v - 1))} aria-label={`Меньше: ${t}`}>−</button><span>{v}</span>
      <button type="button" onClick={() => set(Math.min(20, v + 1))} aria-label={`Больше: ${t}`}>+</button></div></div>
  );
  return (
    <div className={`field ${bare ? "bare" : ""}`}>{!bare && <span className="flabel">Гости</span>}
      <details className="guests" ref={ref}><summary className={`input ${bare ? "seg" : ""}`}><span>{lbl}</span>{bare && <Chev />}</summary>
        <div className="pop"><Step t="Взрослые" v={adults} min={1} set={a => onChange(a, children)} /><Step t="Дети" v={children} min={0} set={c => onChange(adults, c)} /></div>
      </details></div>
  );
}
