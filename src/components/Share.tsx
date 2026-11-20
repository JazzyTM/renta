"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "./Toaster";

// Соцсети и мессенджеры для «Поделиться». Max своей ссылки «поделиться» не даёт — на телефоне он есть в системном меню.
const NETS: { id: string; name: string; color: string; href: (u: string, t: string) => string; icon: React.ReactNode }[] = [
  { id: "vk", name: "ВКонтакте", color: "#0077FF", href: (u, t) => `https://vk.com/share.php?url=${u}&title=${t}`,
    icon: <path fill="#fff" d="M12.8 17c-5.5 0-8.6-3.8-8.8-10h2.8c.1 4.6 2.1 6.5 3.7 6.9V7h2.6v3.9c1.6-.2 3.3-2 3.9-3.9h2.6c-.4 2.4-2.2 4.2-3.5 4.9 1.3.6 3.3 2.2 4.1 5.1h-2.9c-.6-1.9-2.1-3.4-4.2-3.6V17z" /> },
  { id: "tg", name: "Telegram", color: "#27A6E5", href: (u, t) => `https://t.me/share/url?url=${u}&text=${t}`,
    icon: <path fill="#fff" d="M17.7 6.3L4.9 11.2c-.9.4-.9.9-.2 1.1l3.3 1 1.3 3.9c.2.5.1.7.6.7.4 0 .5-.2.8-.4l1.6-1.5 3.3 2.4c.6.3 1 .2 1.2-.6l2.1-10c.3-1.2-.4-1.7-1.2-1.4zM9.6 13.5l7-4.4c.3-.2.6-.1.4.1l-5.8 5.3-.3 2.6-1.3-3.6z" /> },
  { id: "wa", name: "WhatsApp", color: "#25D366", href: (u, t) => `https://wa.me/?text=${t}%20${u}`,
    icon: <path fill="#fff" d="M12 4a8 8 0 00-6.9 12l-1 3.8 3.9-1A8 8 0 1012 4zm4.6 11.3c-.2.6-1.1 1.1-1.6 1.1-.4.1-.9.1-1.5-.1-.3-.1-.8-.3-1.3-.5-2.3-1-3.8-3.3-3.9-3.5-.1-.1-.9-1.2-.9-2.3s.6-1.6.8-1.9c.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4l.7 1.7c.1.1.1.3 0 .4l-.2.4-.3.4c-.1.1-.2.2-.1.5.1.2.6 1 1.3 1.6.9.8 1.6 1 1.9 1.1.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.1.1.6-.1 1.2z" /> },
  { id: "ok", name: "Одноклассники", color: "#EE8208", href: (u, t) => `https://connect.ok.ru/offer?url=${u}&title=${t}`,
    icon: <path fill="#fff" d="M12 12.3a3.7 3.7 0 100-7.3 3.7 3.7 0 000 7.3zm0-5.2a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm1.5 8.1a6.9 6.9 0 002.1-.9 1.1 1.1 0 00-1.2-1.8 4.9 4.9 0 01-4.8 0 1.1 1.1 0 00-1.2 1.8c.7.4 1.4.7 2.1.9l-2 2a1.1 1.1 0 001.6 1.6l1.9-1.9 1.9 1.9a1.1 1.1 0 001.6-1.6l-2-2z" /> },
  { id: "viber", name: "Viber", color: "#7360F2", href: (u, t) => `viber://forward?text=${t}%20${u}`,
    icon: <path fill="#fff" d="M12 4.5c-3.9 0-6.5 1.4-6.5 6 0 2.6.9 4.2 2.4 5v2.7l2.4-2.1c.5.1 1.1.1 1.7.1 3.9 0 6.5-1.4 6.5-5.8S15.9 4.5 12 4.5zm3.2 8.6c-.3.6-.9.9-1.4.8-1.6-.4-3.6-2.3-4-4-.1-.5.2-1.1.8-1.4.3-.1.6 0 .7.2l.6.9c.1.2.1.5-.1.7l-.3.3c.3.9 1.1 1.7 2 2l.3-.3c.2-.2.5-.2.7-.1l.9.6c.2.1.3.4.2.7z" /> },
];

const LinkIcon = <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />;

/** «Поделиться». variant: big — кнопка у объявления; chip — в строке фильтров; link — текстовая ссылка (кабинет).
 *  url — путь или полная ссылка; по умолчанию текущая страница без параметров. */
export function ShareButton({ title, url, variant = "big", label = "Поделиться" }: { title: string; url?: string; variant?: "big" | "chip" | "link"; label?: string }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setHref(url ? new URL(url, location.origin).href : location.href.split("?")[0]); }, [url]);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", on); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", on); document.removeEventListener("keydown", esc); };
  }, [open]);
  async function click() {
    // На телефоне — системное меню: там все приложения человека, включая Max
    if (navigator.share && matchMedia("(pointer: coarse)").matches) { try { await navigator.share({ title, url: href }); } catch {} return; }
    setOpen(o => !o);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(href); toast("Ссылка скопирована"); } catch { toast("Не получилось скопировать", "err"); }
    setOpen(false);
  }
  const u = encodeURIComponent(href), t = encodeURIComponent(title);
  const ico = <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return (
    <div className={`share share-${variant}`} ref={ref}>
      <button type="button" className={variant === "big" ? "cmpbtn big" : variant === "chip" ? "chip ico" : "link sharelink"} onClick={click} aria-expanded={open} aria-haspopup="menu">
        {ico}<span className="lbl">{label}</span></button>
      {open && <div className="share-pop" role="menu">
        <div className="share-nets">{NETS.map(n => <a key={n.id} href={n.href(u, t)} target="_blank" rel="noopener" role="menuitem" onClick={() => setOpen(false)}>
          <span className="share-ic" style={{ background: n.color }}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">{n.icon}</svg></span>{n.name}</a>)}</div>
        <button type="button" className="share-copy" role="menuitem" onClick={copy}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">{LinkIcon}</svg>Скопировать ссылку</button>
      </div>}
    </div>
  );
}

/** Ряд значков соцсетей без меню — для подвала («Расскажите друзьям») */
export function ShareRow({ title, url }: { title: string; url?: string }) {
  const [href, setHref] = useState("");
  useEffect(() => { setHref(url ? new URL(url, location.origin).href : location.origin + "/"); }, [url]);
  const u = encodeURIComponent(href), t = encodeURIComponent(title);
  return (
    <span className="share-row">{NETS.map(n => <a key={n.id} href={href ? n.href(u, t) : undefined} target="_blank" rel="noopener" aria-label={n.name} title={n.name} className="share-ic" style={{ background: n.color }}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">{n.icon}</svg></a>)}</span>
  );
}
