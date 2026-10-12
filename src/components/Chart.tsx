"use client";
import { useState } from "react";

type Pt = { label: string; values: number[] };

// Столбики по дням: подсказка при наведении, переключение показателя, шкала
export function Chart({ data, series, height = 160 }: { data: Pt[]; series: string[]; height?: number }) {
  const [s, setS] = useState(0);
  const [hov, setHov] = useState<number | null>(null);
  const max = Math.max(1, ...data.map(d => d.values[s]));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const total = data.reduce((a, d) => a + d.values[s], 0);
  return (
    <div className="chart">
      <div className="chart-h">
        {series.length > 1 ? <div className="row" style={{ gap: 6 }}>{series.map((t, k) => <button key={t} type="button" className={`chip ${k === s ? "on" : ""}`} onClick={() => setS(k)}>{t}</button>)}</div> : <span />}
        <span className="small muted">Всего: <b className="num">{total.toLocaleString("ru-RU")}</b></span>
      </div>
      <div className="chart-b" style={{ height }} onMouseLeave={() => setHov(null)}>
        <div className="chart-grid">{[top, top / 2, 0].map(v => <span key={v}><i className="num">{Math.round(v).toLocaleString("ru-RU")}</i></span>)}</div>
        <div className="chart-bars">
          {data.map((d, k) => (
            <div key={k} className={`cb ${hov === k ? "on" : ""}`} onMouseEnter={() => setHov(k)} onTouchStart={() => setHov(k)}>
              <i style={{ height: `${(d.values[s] / top) * 100}%` }} />
              {hov === k && <div className={`tip ${k > data.length * 0.7 ? "l" : ""}`}><b>{d.label}</b>{series.map((t, j) => <span key={t} className={j === s ? "cur" : ""}>{t}: <b className="num">{d.values[j].toLocaleString("ru-RU")}</b></span>)}</div>}
            </div>
          ))}
        </div>
      </div>
      <div className="row between small muted"><span>{data[0]?.label}</span><span>{data[data.length - 1]?.label}</span></div>
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 2, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
