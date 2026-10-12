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

const MONTHS_IN = ["январе","феврале","марте","апреле","мае","июне","июле","августе","сентябре","октябре","ноябре","декабре"];
const priceNote = (l: CardData) => l.priceMonth ? `за сутки в ${MONTHS_IN[l.priceMonth - 1]}` : "за сутки";
const place = (l: CardData) => l.address ? (l.address.toLowerCase().includes(l.resort.toLowerCase()) ? l.address : `${l.resort}, ${l.address}`) : `${LISTING_TYPES[l.type]} · ${l.resort}`;

function Price({ l, ci, co, guests }: { l: CardData; ci?: string; co?: string; guests: number }) {
  const q = ci && co ? quote({ ...l, priceFrom: l.priceFrom }, parseDate(ci), parseDate(co), guests) : null;
  if (q) return <div className="pr"><b className="num">{rub(q.total)}</b><span>за {q.n} {plural(q.n, ["ночь", "ночи", "ночей"])}</span></div>;
  if (!l.priceFrom) return <div className="pr"><span>цена по запросу</span></div>;
  return <div className="pr"><b className="num">от {rub(l.priceFrom)}</b><span>{priceNote(l)}</span></div>;
}

// Карточка в сетке (главная, избранное, похожие)
export function ListingCard({ l, ci, co, guests = 2, onHover }: { l: CardData; ci?: string; co?: string; guests?: number; onHover?: (id: string | null) => void }) {
  const qs = ci && co ? `?ci=${ci}&co=${co}` : "";
  return (
    <Link href={`/obj/${l.number}${qs}`} className={`lcard ${l.highlighted ? "hl" : ""}`} onMouseEnter={() => onHover?.(l.id)} onMouseLeave={() => onHover?.(null)}>
      <div className="ph">
        <Photos photos={l.photos} title={l.title} />
        <FavButton id={l.id} />
      </div>
      <div className="t">
        <b className="ttl">{l.title}</b>
        <span className="addr">{place(l)}</span>
        <Price l={l} ci={ci} co={co} guests={guests} />
      </div>
    </Link>
  );
}

const AMEN_ICON: Record<string, string> = {
  parking: "M5 17h14l-1.5-6.5A2 2 0 0015.6 9H8.4a2 2 0 00-1.9 1.5zM7 17v2M17 17v2M7.5 14h.01M16.5 14h.01",
  pool: "M3 18c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1M8 15V5a2 2 0 014 0M16 15V5a2 2 0 00-4 0M8 9h8",
};
const amenIcon = (code: string) => AMEN_ICON[code] ?? AMEN_ICON[Object.keys(AMEN_ICON).find(k => code.includes(k)) ?? ""] ?? "M5 12l4 4L19 6";

// Строка в выдаче курорта: фото слева, описание в середине, цена справа
export function ListingRow({ l, ci, co, guests = 2, onHover }: { l: CardData; ci?: string; co?: string; guests?: number; onHover?: (id: string | null) => void }) {
  const qs = ci && co ? `?ci=${ci}&co=${co}` : "";
  return (
    <Link href={`/obj/${l.number}${qs}`} className={`lrow ${l.highlighted ? "hl" : ""}`} onMouseEnter={() => onHover?.(l.id)} onMouseLeave={() => onHover?.(null)}>
      <div className="ph">
        <Photos photos={l.photos} title={l.title} />
        <FavButton id={l.id} />
      </div>
      <div className="mid">
        <b className="ttl">{l.title}</b>
        <span className="addr">{place(l)}</span>
        <span className="meta">
          {l.ratingCount > 0 && <><span className="score num">{l.ratingAvg.toFixed(1)}</span><span>{l.ratingCount} {plural(l.ratingCount, ["отзыв", "отзыва", "отзывов"])}</span></>}
          {l.verified && <span className="vtag">Проверен</span>}
        </span>
        {l.seaDistance != null && <span className="sea">{l.seaDistance} м до моря</span>}
        {l.amen.length > 0 && <span className="amen">{l.amen.slice(0, 4).map(a => <span key={a.code}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={amenIcon(a.code)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>{a.name}</span>)}</span>}
      </div>
      <div className="pside">
        <Price l={l} ci={ci} co={co} guests={guests} />
        <span className="btn gray">Подробнее</span>
      </div>
    </Link>
  );
}

export function CardSkeleton() {
  return <div className="lcard" aria-hidden="true"><div className="ph sk" /><div className="t" style={{ gap: 8 }}><span className="sk" style={{ height: 12, width: "60%" }} /><span className="sk" style={{ height: 16, width: "90%" }} /><span className="sk" style={{ height: 14, width: "40%" }} /></div></div>;
}

export function RowSkeleton() {
  return <div className="lrow" aria-hidden="true"><div className="ph sk" /><div className="mid" style={{ gap: 10 }}><span className="sk" style={{ height: 18, width: "70%" }} /><span className="sk" style={{ height: 14, width: "50%" }} /><span className="sk" style={{ height: 14, width: "30%" }} /></div><div className="pside"><span className="sk" style={{ height: 22, width: 110 }} /></div></div>;
}
