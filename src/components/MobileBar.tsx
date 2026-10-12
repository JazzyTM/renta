"use client";
import { useEffect, useState } from "react";
import { rub } from "@/lib/format";
// Нижняя панель на телефоне: цена и быстрые кнопки связи
export function MobileBar({ price, requests }: { price: number; requests: boolean }) {
  const [tel, setTel] = useState("");
  useEffect(() => { const on = (e: Event) => setTel(String((e as CustomEvent).detail)); window.addEventListener("phone", on); return () => window.removeEventListener("phone", on); }, []);
  const fire = (d: string) => window.dispatchEvent(new CustomEvent("book", { detail: d }));
  return (
    <div className="mbar">
      <span>{price ? <><b className="num">от {rub(price)}</b><span className="small muted"> / ночь</span></> : <span className="muted">Цена по запросу</span>}</span>
      <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
        {requests && <button type="button" className="btn ghost sm" onClick={() => fire("request")}>Заявка</button>}
        {tel ? <a className="btn sm" href={`tel:${tel.replace(/[^+\d]/g, "")}`}>Позвонить</a> : <button type="button" className="btn sm" onClick={() => fire("phone")}>Позвонить</button>}
      </div>
    </div>
  );
}
