"use client";
import { Children, useEffect, useRef, useState } from "react";

// Мастер объявления: шаги по одному с прогрессом; для опубликованного объявления — вкладки
export function Steps({ titles, done, wizard, children }: { titles: string[]; done: boolean[]; wizard: boolean; children: React.ReactNode }) {
  const items = Children.toArray(children);
  const [i, setI] = useState(() => (wizard ? Math.max(0, done.findIndex(d => !d)) : 0));
  const box = useRef<HTMLDivElement>(null);
  const go = (n: number) => { setI(Math.max(0, Math.min(items.length - 1, n))); box.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  // В режиме мастера после сохранения шага переходим к следующему
  useEffect(() => {
    const el = box.current; if (!el || !wizard) return;
    const on = () => setI(n => Math.min(items.length - 1, n + 1));
    el.addEventListener("form-ok", on); return () => el.removeEventListener("form-ok", on);
  }, [wizard, items.length]);
  const pct = Math.round(done.filter(Boolean).length / done.length * 100);
  return (
    <div className="steps" ref={box}>
      {wizard && <div className="sprog"><div className="sbar2"><i style={{ width: `${pct}%` }} /></div><span className="small muted">Заполнено {pct}%</span></div>}
      <nav className="snav" role="tablist">{titles.map((t, k) => (
        <button key={t} type="button" role="tab" aria-selected={k === i} className={`${k === i ? "on" : ""} ${done[k] ? "ok" : ""}`} onClick={() => go(k)}>
          <span className="sn">{done[k] ? "✓" : k + 1}</span>{t}
        </button>))}</nav>
      {items.map((c, k) => <div key={k} hidden={k !== i}>{c}</div>)}
      <div className="sfoot">
        {i > 0 ? <button type="button" className="btn ghost" onClick={() => go(i - 1)}>Назад</button> : <span />}
        {i < items.length - 1 && <button type="button" className="btn ghost" onClick={() => go(i + 1)}>{wizard ? "Пропустить" : "Дальше"}</button>}
      </div>
    </div>
  );
}
