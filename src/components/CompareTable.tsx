"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CardData } from "@/lib/card";
import { LISTING_TYPES } from "@/lib/labels";
import { rub } from "@/lib/format";
import { thumb } from "@/lib/img";
import { useCmp, removeCmp, readCmp } from "./Compare";

export function CompareTable() {
  const ids = useCmp();
  const [items, setItems] = useState<CardData[] | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const want = key || readCmp().join(",");
    if (!want) { setItems([]); return; }
    fetch(`/api/cards?ids=${want}`).then(r => r.json()).then(d => setItems(d.items)).catch(() => setItems([]));
  }, [key]);
  if (items === null) return <div className="panel"><span className="sk" style={{ display: "block", height: 200 }} /></div>;
  const list = items.filter(x => !key || ids.includes(x.id));
  if (!list.length) return <div className="panel empty"><b>Здесь пока пусто</b><p className="muted">Нажмите «Сравнить» у объявлений в поиске, чтобы сравнить их рядом.</p><Link className="btn" href="/search">Найти жильё</Link></div>;
  const amen = [...new Map(list.flatMap(l => l.amen).map(a => [a.code, a.name])).entries()];
  const best = Math.min(...list.filter(l => l.priceFrom).map(l => l.priceFrom));
  const near = Math.min(...list.filter(l => l.seaDistance != null).map(l => l.seaDistance!));
  const rows: [string, (l: CardData) => React.ReactNode][] = [
    ["Цена от", l => l.priceFrom ? <b className={l.priceFrom === best ? "good" : ""}>{rub(l.priceFrom)}</b> : "по запросу"],
    ["Тип", l => LISTING_TYPES[l.type]],
    ["Курорт", l => l.resort],
    ["До моря", l => l.seaDistance != null ? <span className={l.seaDistance === near ? "good" : ""}>{l.seaDistance} м</span> : "—"],
    ["Рейтинг", l => l.ratingCount ? `${l.ratingAvg.toFixed(1)} (${l.ratingCount})` : "нет отзывов"],
    ["Хозяин проверен", l => l.verified ? "да" : "нет"],
    ...amen.map(([code, name]) => [name, (l: CardData) => l.amen.some(a => a.code === code) ? "✓" : "—"] as [string, (l: CardData) => React.ReactNode]),
  ];
  return (
    <div className="panel cmpwrap"><table className="cmpt">
      <thead><tr><th />{list.map(l => <th key={l.id}>
        <Link href={`/obj/${l.number}`} className="cmph">{l.photos[0] ? <img src={thumb(l.photos[0])} alt="" /> : <span className="noimg" />}<b>{l.title}</b></Link>
        <button type="button" className="link small" onClick={() => removeCmp(l.id)}>Убрать</button></th>)}</tr></thead>
      <tbody>{rows.map(([t, f]) => <tr key={t}><td>{t}</td>{list.map(l => <td key={l.id}>{f(l)}</td>)}</tr>)}</tbody>
    </table></div>
  );
}
