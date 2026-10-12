"use client";
import { useEffect, useState } from "react";
import type { CardData } from "@/lib/card";
import { ListingCard } from "./ListingCard";

const KEY = "seen";
// Запоминает просмотренное объявление и показывает предыдущие
export function Recent({ id }: { id: string }) {
  const [items, setItems] = useState<CardData[]>([]);
  useEffect(() => {
    let list: string[] = [];
    try { list = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}
    const prev = list.filter(x => x !== id).slice(0, 4);
    try { localStorage.setItem(KEY, JSON.stringify([id, ...list.filter(x => x !== id)].slice(0, 20))); } catch {}
    if (!prev.length) return;
    fetch(`/api/cards?ids=${prev.join(",")}`).then(r => r.json()).then(d => setItems(d.items)).catch(() => {});
  }, [id]);
  if (!items.length) return null;
  return <section className="section" style={{ paddingTop: 0 }}><h2 className="h2" style={{ marginBottom: 14 }}>Вы смотрели</h2><div className="cards">{items.map(l => <ListingCard key={l.id} l={l} />)}</div></section>;
}
