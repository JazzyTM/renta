"use client";
import { useEffect, useState } from "react";

type T = { id: number; text: string; kind: "ok" | "err" | "info" };
let n = 0;

// Всплывающее уведомление из любого клиентского компонента: toast("Сохранено")
export function toast(text: string, kind: T["kind"] = "ok") {
  window.dispatchEvent(new CustomEvent("toast", { detail: { text, kind } }));
}

export function Toaster() {
  const [list, setList] = useState<T[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const t = { id: ++n, ...(e as CustomEvent).detail } as T;
      setList(l => [...l.slice(-3), t]);
      setTimeout(() => setList(l => l.filter(x => x.id !== t.id)), t.kind === "err" ? 6000 : 3500);
    };
    window.addEventListener("toast", on);
    return () => window.removeEventListener("toast", on);
  }, []);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map(t => <div key={t.id} className={`toast ${t.kind}`} onClick={() => setList(l => l.filter(x => x.id !== t.id))}>{t.text}</div>)}
    </div>
  );
}
