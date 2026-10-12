"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFavs, readFavs } from "./Fav";
import { ListingCard, CardSkeleton } from "./ListingCard";
import type { CardData } from "@/lib/card";

export function FavList() {
  const ids = useFavs();
  const [items, setItems] = useState<CardData[] | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const want = key || readFavs().join(",");
    if (!want) { setItems([]); return; }
    let off = false;
    fetch(`/api/cards?ids=${want}`).then(r => r.json()).then(d => { if (!off) setItems(d.items); }).catch(() => { if (!off) setItems([]); });
    return () => { off = true; };
  }, [key]);
  const shown = items && (key ? items.filter(x => ids.includes(x.id)) : items.filter(x => readFavs().includes(x.id)));
  if (shown === null) return <div className="cards">{[0, 1, 2].map(i => <CardSkeleton key={i} />)}</div>;
  if (!shown.length) return (
    <div className="empty"><p>Здесь пока пусто. Нажмите на сердечко у объявления, чтобы сохранить его.</p><Link className="btn" href="/search">Найти жильё</Link></div>
  );
  return <div className="cards">{shown.map(l => <ListingCard key={l.id} l={l} />)}</div>;
}
