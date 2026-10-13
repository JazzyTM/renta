"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavItem = { href: string; label: string; badge?: number } | { group: string };

// Боковое меню кабинета и админки. На телефоне и планшете сворачивается в кнопку с текущим разделом.
export function SideNav({ items, root }: { items: NavItem[]; root: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const links = items.filter((it): it is Extract<NavItem, { href: string }> => "href" in it);
  const isOn = (href: string) => (href === root ? path === root : path.startsWith(href));
  const cur = [...links].sort((a, b) => b.href.length - a.href.length).find(l => isOn(l.href)) ?? (path.startsWith(root) ? links.find(l => l.href === root) : undefined);
  const badges = links.reduce((a, l) => a + (l.badge ?? 0), 0);
  return (
    <aside className={`side ${open ? "open" : ""}`}>
      <button type="button" className="side-t" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <span>{cur?.label ?? "Меню"}</span>
        {badges > 0 && !open && <span className="tag accent">{badges}</span>}
        <svg className="chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      <nav className="side-l">
        {items.map((it, i) => "group" in it ? <div className="grp" key={i}>{it.group}</div> : (
          <Link key={it.href} href={it.href} className={cur?.href === it.href ? "on" : ""}>
            {it.label}{it.badge ? <span className="tag accent">{it.badge}</span> : null}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
