"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "./Toaster";

// «Поделиться»: на телефоне системное меню, на компьютере ссылки на мессенджеры и копирование
export function ShareButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", on); return () => document.removeEventListener("click", on);
  }, [open]);
  async function click() {
    const url = location.href.split("?")[0];
    if (navigator.share && matchMedia("(pointer: coarse)").matches) { try { await navigator.share({ title, url }); } catch {} return; }
    setOpen(o => !o);
  }
  const url = typeof location !== "undefined" ? location.href.split("?")[0] : "";
  const u = encodeURIComponent(url), t = encodeURIComponent(title);
  return (
    <div className="share" ref={ref}>
      <button type="button" className="cmpbtn big" onClick={click} aria-expanded={open} aria-label="Поделиться">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="lbl">Поделиться</span></button>
      {open && <div className="share-pop">
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); toast("Ссылка скопирована"); } catch { toast("Не получилось скопировать", "err"); } setOpen(false); }}>Скопировать ссылку</button>
        <a href={`https://t.me/share/url?url=${u}&text=${t}`} target="_blank" rel="noopener">Telegram</a>
        <a href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noopener">WhatsApp</a>
        <a href={`https://vk.com/share.php?url=${u}&title=${t}`} target="_blank" rel="noopener">ВКонтакте</a>
      </div>}
    </div>
  );
}
