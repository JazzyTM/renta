"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { LISTING_TYPES } from "@/lib/labels";
import { rub, plural, parseDate } from "@/lib/format";
import { quote } from "@/lib/pricing";
import { thumb } from "@/lib/img";
import type { CardData } from "@/lib/card";
import { FavButton } from "./Fav";

// Листание фото прямо в карточке: свайп на телефоне, стрелки при наведении на компьютере
function Photos({ photos, title }: { photos: string[]; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const go = (e: React.MouseEvent, d: number) => {
    e.preventDefault(); e.stopPropagation();
    const el = box.current!; const n = Math.max(0, Math.min(photos.length - 1, i + d));
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };
  if (!photos.length) return <span className="noimg">Нет фото</span>;
  return (
    <>
      <div className="slides" ref={box} onScroll={e => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {photos.map((u, k) => <img key={u} src={thumb(u)} alt={k === 0 ? title : ""} loading={k === 0 ? "lazy" : "lazy"} draggable={false} />)}
      </div>
      {photos.length > 1 && <>
        {i > 0 && <button type="button" className="sl prev" aria-label="Предыдущее фото" onClick={e => go(e, -1)}>‹</button>}
        {i < photos.length - 1 && <button type="button" className="sl next" aria-label="Следующее фото" onClick={e => go(e, 1)}>›</button>}
        <span className="dots">{photos.map((_, k) => <i key={k} className={k === i ? "on" : ""} />)}</span>
      </>}
    </>
  );
}

export function ListingCard({ l, ci, co, guests = 2, onHover }: { l: CardData; ci?: string; co?: string; guests?: number; onHover?: (id: string | null) => void }) {
  const q = ci && co ? quote({ ...l, priceFrom: l.priceFrom }, parseDate(ci), parseDate(co), guests) : null;
  const qs = ci && co ? `?ci=${ci}&co=${co}` : "";
  return (
    <Link href={`/obj/${l.number}${qs}`} className={`lcard ${l.highlighted ? "hl" : ""}`} onMouseEnter={() => onHover?.(l.id)} onMouseLeave={() => onHover?.(null)}>
      <div className="ph">
        <Photos photos={l.photos} title={l.title} />
        {l.verified && <span className="badge tag ok">Проверен</span>}
        <FavButton id={l.id} />
      </div>
      <div className="t">
        <span className="row between small muted"><span>{LISTING_TYPES[l.type]} · {l.resort}</span>{l.ratingCount > 0 && <span className="rating">★ <b className="num">{l.ratingAvg.toFixed(1)}</b></span>}</span>
        <b>{l.title}</b>
        {l.seaDistance != null && <span className="seaLine small">{l.seaDistance} м до моря</span>}
        <span className="num" style={{ marginTop: 2 }}>{q ? <><b>{rub(q.total)}</b> <span className="muted small">за {q.n} {plural(q.n, ["ночь", "ночи", "ночей"])}</span></> : l.priceFrom ? <><b>от {rub(l.priceFrom)}</b> <span className="muted small">/ ночь</span></> : <span className="muted small">цена по запросу</span>}</span>
      </div>
    </Link>
  );
}

export function CardSkeleton() {
  return <div className="lcard" aria-hidden="true"><div className="ph sk" /><div className="t" style={{ gap: 8 }}><span className="sk" style={{ height: 12, width: "60%" }} /><span className="sk" style={{ height: 16, width: "90%" }} /><span className="sk" style={{ height: 14, width: "40%" }} /></div></div>;
}
