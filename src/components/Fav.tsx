"use client";
import { useEffect, useState } from "react";
import { toggleFavorite } from "@/app/(site)/obj/[number]/actions";
import { toast } from "./Toaster";

// Избранное живёт в браузере и работает без входа. Если человек вошёл, оно синхронизируется с аккаунтом.
const KEY = "favs";
export function readFavs(): string[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
function writeFavs(ids: string[]) { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch {} window.dispatchEvent(new Event("favs")); }

export function useFavs() {
  const [ids, set] = useState<string[]>([]);
  useEffect(() => { const on = () => set(readFavs()); on(); window.addEventListener("favs", on); window.addEventListener("storage", on); return () => { window.removeEventListener("favs", on); window.removeEventListener("storage", on); }; }, []);
  return ids;
}

export function FavButton({ id, big }: { id: string; big?: boolean }) {
  const favs = useFavs();
  const on = favs.includes(id);
  async function click(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const next = on ? favs.filter(x => x !== id) : [...favs, id];
    writeFavs(next);
    toast(on ? "Убрано из избранного" : "Добавлено в избранное");
    const r = await toggleFavorite(id).catch(() => null);
    if (r && "fav" in r && r.fav !== !on) await toggleFavorite(id); // выравниваем с сервером
  }
  return (
    <button type="button" className={`fav ${on ? "on" : ""} ${big ? "big" : ""}`} aria-label={on ? "Убрать из избранного" : "В избранное"} aria-pressed={on} onClick={click}>
      <svg viewBox="0 0 24 24" width={big ? 22 : 20} height={big ? 22 : 20} aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.4 3 5 6.4 5c2 0 3.4 1.1 4.1 2.3h3C14.2 6.1 15.6 5 17.6 5 21 5 23 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" /></svg>
      {big && <span className="lbl">{on ? "В избранном" : "В избранное"}</span>}
    </button>
  );
}

// После входа: переносит избранное из браузера в аккаунт и обратно
export function FavSync({ server }: { server: string[] | null }) {
  useEffect(() => {
    if (!server) return;
    const local = readFavs();
    const missing = local.filter(x => !server.includes(x));
    Promise.all(missing.map(id => toggleFavorite(id))).finally(() => writeFavs([...new Set([...server, ...local])]));
  }, [server]);
  return null;
}
