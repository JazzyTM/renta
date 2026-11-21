"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "./Toaster";
import { MsgIcon } from "./Messenger";
import type { ChannelKind } from "@/lib/contacts";

// Куда делиться: MAX, Telegram, ВКонтакте, WhatsApp.
// MAX: веб-версия открывает окно «Поделиться» по адресу web.max.ru/:share?text=… (параметр text — текст со ссылкой).
const NETS: { id: ChannelKind; name: string; href: (u: string, t: string) => string }[] = [
  { id: "max", name: "MAX", href: (u, t) => `https://web.max.ru/:share?text=${t}%20${u}` },
  { id: "tg", name: "Telegram", href: (u, t) => `https://t.me/share/url?url=${u}&text=${t}` },
  { id: "vk", name: "ВКонтакте", href: (u, t) => `https://vk.com/share.php?url=${u}&title=${t}` },
  { id: "wa", name: "WhatsApp", href: (u, t) => `https://wa.me/?text=${t}%20${u}` },
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
  // Своё меню везде (MAX, Telegram, ВКонтакте, WhatsApp); системное «Поделиться» — пунктом «Другие приложения»
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches); }, []);
  const click = () => setOpen(o => !o);
  async function more() { setOpen(false); try { await navigator.share({ title, url: href }); } catch {} }
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
          <MsgIcon kind={n.id} size={32} />{n.name}</a>)}</div>
        {native && <button type="button" className="share-more" role="menuitem" onClick={more}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 12h.01M12 12h.01M18 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>Другие приложения…</button>}
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
    <span className="share-row">{NETS.map(n => <a key={n.id} href={href ? n.href(u, t) : undefined} target="_blank" rel="noopener" aria-label={`Поделиться в ${n.name}`} title={n.name}>
      <MsgIcon kind={n.id} size={36} /></a>)}</span>
  );
}
