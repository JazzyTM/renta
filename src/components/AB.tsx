"use client";
import { useEffect, useState } from "react";

type Exp = { key: string; goal: string; variants: string[] };
let list: Promise<Exp[]> | null = null;
const load = (): Promise<Exp[]> => (list ??= fetch("/api/ab").then(r => r.json() as Promise<Exp[]>).catch(() => [] as Exp[]));
const send = (key: string, variant: number, kind: string) =>
  fetch("/api/ab", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, variant, kind }), keepalive: true }).catch(() => {});
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const put = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

// Текст из A/B-теста: посетитель всегда видит один и тот же вариант
export function useAB(key: string, def: string) {
  const [text, setText] = useState(def);
  useEffect(() => {
    let off = false;
    load().then(all => {
      const e = all.find(x => x.key === key);
      if (!e || off || !e.variants.length) return;
      let i = Number(get(`ab:${key}`) ?? NaN);
      if (!(i >= 0 && i < e.variants.length)) { i = Math.floor(Math.random() * e.variants.length); put(`ab:${key}`, String(i)); }
      setText(e.variants[i]);
      try { if (!sessionStorage.getItem(`abv:${key}`)) { sessionStorage.setItem(`abv:${key}`, "1"); send(key, i, "view"); } } catch {}
    });
    return () => { off = true; };
  }, [key]);
  return text;
}

// Посетитель сделал целевое действие: засчитываем во всех его тестах с этой целью, один раз
export function abGoal(goal: string) {
  load().then(all => all.filter(e => e.goal === goal).forEach(e => {
    const i = get(`ab:${e.key}`);
    if (i == null || get(`abg:${e.key}`)) return;
    put(`abg:${e.key}`, "1"); send(e.key, Number(i), "goal");
  }));
}
