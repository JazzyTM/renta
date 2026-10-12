"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "./Logo";
import { useFavs } from "./Fav";
import { AuthModal } from "./AuthModal";

type U = { name: string; email: string | null; staff: boolean } | null;

export function Header({ user, siteName, social }: { user: U; siteName: string; social: { vk: boolean; ya: boolean } }) {
  const favs = useFavs();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [auth, setAuth] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setMenu(false); }, [path]);
  useEffect(() => {
    const on = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(false); };
    const open = () => setAuth(true);
    document.addEventListener("click", on); window.addEventListener("open-login", open);
    return () => { document.removeEventListener("click", on); window.removeEventListener("open-login", open); };
  }, []);
  const initial = (user?.name || user?.email || "?").trim()[0]?.toUpperCase();
  return (
    <header className="top"><div className="wrap">
      <Link href="/" className="logo"><LogoMark />{siteName.toLowerCase()}</Link>
      <nav>
        <Link className="navlink hide-sm" href="/search">Поиск</Link>
        <Link className="navlink favlink" href="/favorites" aria-label="Избранное">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.4 3 5 6.4 5c2 0 3.4 1.1 4.1 2.3h3C14.2 6.1 15.6 5 17.6 5 21 5 23 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" /></svg>
          <span className="hide-sm">Избранное</span>{favs.length > 0 && <span className="cnt">{favs.length}</span>}
        </Link>
        <Link className="navlink cta hide-sm" href="/cabinet">Сдать жильё</Link>
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
        ) : <button type="button" className="btn sm" onClick={() => setAuth(true)}>Войти</button>}
      </nav>
      {auth && <AuthModal onClose={() => setAuth(false)} social={social} />}
    </div></header>
  );
}

export const openLogin = () => window.dispatchEvent(new Event("open-login"));
