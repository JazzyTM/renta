"use client";
import { useEffect, useState } from "react";
import { rub } from "@/lib/format";

// Ползунок цены с гистограммой: видно, сколько вариантов в каком диапазоне
export function PriceRange({ hist, lo, hi, onChange }: { hist: { min: number; max: number; bins: number[] }; lo: number; hi: number; onChange: (lo: number, hi: number) => void }) {
  const [a, setA] = useState(lo), [b, setB] = useState(hi);
  useEffect(() => { setA(lo); setB(hi); }, [lo, hi]);
  const { min, max, bins } = hist;
  const top = Math.max(1, ...bins), step = (max - min) / bins.length;
  const commit = () => onChange(Math.min(a, b), Math.max(a, b));
  const pct = (v: number) => ((v - min) / (max - min || 1)) * 100;
  return (
    <div className="prange">
      <div className="phist">{bins.map((c, i) => { const from = min + i * step; const inside = from + step > Math.min(a, b) && from < Math.max(a, b); return <i key={i} className={inside ? "in" : ""} style={{ height: `${Math.max(4, (c / top) * 100)}%` }} />; })}</div>
      <div className="ptrack"><span style={{ left: `${pct(Math.min(a, b))}%`, right: `${100 - pct(Math.max(a, b))}%` }} />
        <input type="range" min={min} max={max} step={100} value={a} aria-label="Цена от" onChange={e => setA(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit} />
        <input type="range" min={min} max={max} step={100} value={b} aria-label="Цена до" onChange={e => setB(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit} />
      </div>
      <div className="row between small"><span>{rub(Math.min(a, b))}</span><span>{Math.max(a, b) >= max ? `${rub(max)}+` : rub(Math.max(a, b))}</span></div>
    </div>
  );
}
