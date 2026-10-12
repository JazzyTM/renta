"use client";
import { useState } from "react";

// Показывает первые limit элементов, остальные по кнопке
export function ShowMore({ children, className, limit, label = "Показать ещё" }: { children: React.ReactNode[]; className: string; limit: number; label?: string }) {
  const [all, setAll] = useState(false);
  return (
    <>
      <div className={className}>{all ? children : children.slice(0, limit)}</div>
      {!all && children.length > limit && <button type="button" className="btn gray wide more" onClick={() => setAll(true)}>{label}</button>}
    </>
  );
}

// Вкладки с группами курортов
export function Tabs({ tabs }: { tabs: { title: string; body: React.ReactNode }[] }) {
  const [i, setI] = useState(0);
  return (
    <div className="utabs">
      <div className="utabs-h" role="tablist">{tabs.map((t, k) => <button key={t.title} type="button" role="tab" aria-selected={k === i} className={k === i ? "on" : ""} onClick={() => setI(k)}>{t.title}</button>)}</div>
      <div role="tabpanel">{tabs[i]?.body}</div>
    </div>
  );
}
