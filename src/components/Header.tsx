"use client";
import { Logo } from "./Logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFavs } from "./Fav";
import { AuthModal } from "./AuthModal";
import { LiveNotify } from "./LiveNotify";
import { regionAll } from "@/lib/regions";

type U = { name: string; email: string | null; staff: boolean } | null;
type Reg = { name: string; slug: string; resorts: { name: string; slug: string }[] };

const Ico = ({ d, size = 24 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const HEART = "M12 20.5s-7.8-4.7-9.5-9.6C1.4 7.6 3.5 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.3 0 5.4 3.1 4.3 6.4-1.7 4.9-9.5 9.6-9.5 9.6z";
const PIN = "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11zM12 12.3a2.3 2.3 0 100-4.6 2.3 2.3 0 000 4.6z";
const LOGIN = "M10 17l5-5-5-5M15 12H3M14 3h4a3 3 0 013 3v12a3 3 0 01-3 3h-4";

export function Header({ user, siteName, social, regions }: { user: U; siteName: string; social: { vk: boolean; ya: boolean; code: boolean }; regions: Reg[] }) {
  const favs = useFavs();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [pick, setPick] = useState(false);
  const [auth, setAuth] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pref = useRef<HTMLDivElement>(null);
  useEffect(() => { setMenu(false); setPick(false); }, [path]);
  useEffect(() => {
    const on = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(false);
      if (!pref.current?.contains(e.target as Node)) setPick(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setPick(false); setMenu(false); } };
    const open = () => setAuth(true);
    document.addEventListener("click", on); document.addEventListener("keydown", esc); window.addEventListener("open-login", open);
    return () => { document.removeEventListener("click", on); document.removeEventListener("keydown", esc); window.removeEventListener("open-login", open); };
  }, []);
  const slug = path.match(/^\/kurort\/([^/]+)/)?.[1];
  const regSlug = path.match(/^\/kurorty\/([^/]+)/)?.[1];
  const curReg = regSlug ? regions.find(r => r.slug === regSlug) : undefined;
  const current = curReg ? regionAll(curReg.name) : slug ? regions.flatMap(r => r.resorts).find(r => r.slug === slug)?.name : undefined;
  const curTab = Math.max(0, curReg ? regions.indexOf(curReg) : regions.findIndex(r => r.resorts.some(x => x.slug === slug)));
  const [tab, setTab] = useState(curTab);
  useEffect(() => {
    if (!pick) return;
    setTab(curTab);
    // на телефоне регионы — лента: прокручиваем к выбранному
    requestAnimationFrame(() => {
      const el = pref.current?.querySelector<HTMLElement>(".rp-tabs .on"), box = el?.parentElement;
      if (el && box && box.scrollWidth > box.clientWidth) box.scrollLeft = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
    });
  }, [pick, curTab]);
  const initial = (user?.name || user?.email || "?").trim()[0]?.toUpperCase();

  return (
    <header className="top"><div className="wrap">
      <Link href="/" className="logo" aria-label={siteName}><Logo name={siteName} /></Link>
      <div className="rpick" ref={pref}>
        <button type="button" className="rpick-btn" aria-label="Выбрать курорт" aria-expanded={pick} onClick={() => setPick(p => !p)}>
          <span className="rpick-ico"><Ico size={22} d={PIN} /></span>
          <span className="rpick-t">{current ?? "Выберите курорт"}</span><span className="rpick-chev"><Ico size={16} d="M6 9l6 6 6-6" /></span>
        </button>
        {pick && regions.length > 0 && <div className="rpick-pop">
          <div className="rp-tabs" role="tablist">
            {regions.map((r, i) => <button key={r.name} type="button" role="tab" aria-selected={i === tab} className={i === tab ? "on" : ""} onClick={() => setTab(i)} onMouseEnter={() => setTab(i)}>{r.name}<span>{r.resorts.length}</span></button>)}
          </div>
          <ul className="rp-list" role="tabpanel">
            {regions[tab] && <li className="rp-all"><Link href={`/kurorty/${regions[tab].slug}`} className={path === `/kurorty/${regions[tab].slug}` ? "on" : ""}>{regionAll(regions[tab].name)} →</Link></li>}
            {regions[tab]?.resorts.map(x => <li key={x.slug}><Link href={`/kurort/${x.slug}`} className={x.slug === slug ? "on" : ""}>{x.name}</Link></li>)}
          </ul>
        </div>}
      </div>
      <nav>
        <Link className="ibtn" href="/favorites" aria-label="Избранное" title="Избранное"><Ico d={HEART} />{favs.length > 0 && <span className="cnt">{favs.length}</span>}</Link>
        {user && <LiveNotify />}
        {user ? (
          <div className="umenu" ref={ref}>
            <button type="button" className="avatar" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(m => !m)}>{initial}</button>
            {menu && <div className="drop" role="menu">
              <div className="drop-h"><b>{user.name || "Профиль"}</b><span className="small muted">{user.email}</span></div>
              <Link href="/my" role="menuitem">Мои поездки</Link>
              <Link href="/cabinet" role="menuitem">Кабинет хозяина</Link>
              {user.staff && <Link href="/admin" role="menuitem">Админка</Link>}
              <Link href="/account" role="menuitem">Профиль</Link>
              <form action="/logout" method="post"><button role="menuitem">Выйти</button></form>
            </div>}
          </div>
        ) : <button type="button" className="ibtn" aria-label="Войти" title="Войти" onClick={() => setAuth(true)}><Ico d={LOGIN} /></button>}
        <Link className="obtn" href={user ? "/cabinet/new" : "/razmestit"} aria-label="Сдать жильё" title="Сдать жильё"><Ico size={20} d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v8M8 12h8" /><span className="obtn-t">Сдать жильё</span></Link>
      </nav>
      {auth && <AuthModal onClose={() => setAuth(false)} social={social} />}
    </div></header>
  );
}

export const openLogin = () => window.dispatchEvent(new Event("open-login"));
