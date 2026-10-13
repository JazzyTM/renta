"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "./Toaster";

// Список сравнения хранится в браузере, до 4 объявлений
const KEY = "cmp", MAX = 4;
export function readCmp(): string[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
function write(ids: string[]) { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch {} window.dispatchEvent(new Event("cmp")); }
export function useCmp() {
  const [ids, set] = useState<string[]>([]);
  useEffect(() => { const on = () => set(readCmp()); on(); window.addEventListener("cmp", on); window.addEventListener("storage", on); return () => { window.removeEventListener("cmp", on); window.removeEventListener("storage", on); }; }, []);
  return ids;
}
export function removeCmp(id: string) { write(readCmp().filter(x => x !== id)); }

export function CompareButton({ id, className = "cmpbtn" }: { id: string; className?: string }) {
  const ids = useCmp();
  const on = ids.includes(id);
  function click(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (on) { write(ids.filter(x => x !== id)); return; }
    if (ids.length >= MAX) { toast(`Сравнить можно до ${MAX} вариантов`, "err"); return; }
    write([...ids, id]); toast("Добавлено к сравнению");
  }
  return <button type="button" className={`${className} ${on ? "on" : ""}`} aria-pressed={on} onClick={click}>
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d={on ? "M5 12.5l4.5 4.5L19 7" : "M5 20V10M12 20V4M19 20v-7"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    {on ? "В сравнении" : "Сравнить"}</button>;
}

// Плашка внизу экрана, когда что-то добавлено к сравнению
export function CompareBar() {
  const ids = useCmp();
  if (ids.length === 0) return null;
  return <div className="cmpbar"><span>К сравнению: <b>{ids.length}</b></span><Link className="btn sm" href="/compare">Сравнить</Link><button type="button" className="x" aria-label="Очистить" onClick={() => write([])}>×</button></div>;
}
