"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "./Toaster";

// Значок уведомлений в шапке: проверяет новые раз в 30 секунд, о новых сообщает окошком и коротким звуком
export function LiveNotify() {
  const [n, setN] = useState(0);
  const since = useRef(0);
  useEffect(() => {
    let stop = false, t: ReturnType<typeof setTimeout>;
    async function tick() {
      try {
        const r = await fetch(`/api/notifications?since=${since.current}`).then(r => r.json());
        setN(r.unread);
        if (since.current && r.items?.length) {
          beep();
          for (const it of r.items) toast(it.title);
        }
        since.current = r.now ?? Date.now();
      } catch {}
      if (!stop) t = setTimeout(tick, document.hidden ? 120_000 : 30_000);
    }
    tick();
    const vis = () => { if (!document.hidden) { clearTimeout(t); tick(); } };
    document.addEventListener("visibilitychange", vis);
    return () => { stop = true; clearTimeout(t); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return (
    <Link className="ibtn" href="/cabinet/notifications" aria-label={`Уведомления${n ? `: ${n} новых` : ""}`} title="Уведомления">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {n > 0 && <span className="cnt">{n > 99 ? "99+" : n}</span>}
    </Link>
  );
}

function beep() {
  try {
    const C = window.AudioContext || (window as any).webkitAudioContext; const a = new C();
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.value = 880; g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.15, a.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.35);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.4);
  } catch {}
}
