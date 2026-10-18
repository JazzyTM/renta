"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Значки пунктов меню по последней части адреса
const I: Record<string, string> = {
  admin: "M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-4H4z",
  moderation: "M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6zM9 12l2 2 4-4",
  listings: "M4 11l8-6 8 6v9H4zM10 20v-5h4v5",
  cabinet: "M4 11l8-6 8 6v9H4zM10 20v-5h4v5",
  bookings: "M5 5h14v15H5zM5 9h14M9 3v4M15 3v4M8 13h3M8 16h6",
  reviews: "M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z",
  complaints: "M5 21V4M5 4h11l-2 4 2 4H5",
  users: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 6.5M18 14.5c1.8.7 3 2.6 3.5 5.5",
  idcheck: "M4 6h16v12H4zM9 13a2 2 0 100-4 2 2 0 000 4zM6 16c.5-1.5 1.6-2 3-2s2.5.5 3 2M14 10h4M14 13h3",
  verify: "M4 6h16v12H4zM9 13a2 2 0 100-4 2 2 0 000 4zM6 16c.5-1.5 1.6-2 3-2s2.5.5 3 2M14 10h4M14 13h3",
  demand: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  stats: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  experiments: "M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M7 15h10",
  regions: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  resorts: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11zM12 12.3a2.3 2.3 0 100-4.6 2.3 2.3 0 000 4.6z",
  beaches: "M3 18c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1M12 14V5M12 5c-4 0-7 2-7 5h14c0-3-3-5-7-5z",
  amenities: "M5 12l4 4L19 6",
  stopwords: "M12 3a9 9 0 100 18 9 9 0 000-18zM5.6 5.6l12.8 12.8",
  pages: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5",
  articles: "M4 5h16v14H4zM8 9h8M8 13h8M8 17h5",
  banners: "M4 6h16v9H4zM8 19h8M12 15v4",
  seopages: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5",
  orders: "M3 6h18v12H3zM3 10h18M7 15h4",
  tariffs: "M20 12l-8 8-9-9V3h8zM7.5 7.5h.01",
  tariff: "M20 12l-8 8-9-9V3h8zM7.5 7.5h.01",
  promocodes: "M4 8a2 2 0 002-2h12a2 2 0 002 2v8a2 2 0 00-2 2H6a2 2 0 00-2-2zM10 9v6",
  promotions: "M12 19V5M5 12l7-7 7 7",
  campaigns: "M3 11l15-6v14L3 13zM7 13v5h3",
  emails: "M3 6h18v12H3zM3 7l9 6 9-6",
  emaillog: "M3 6h18v12H3zM3 7l9 6 9-6",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  redirects: "M4 12h13M13 6l6 6-6 6",
  audit: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z",
  updates: "M21 12a9 9 0 11-3-6.7M21 4v5h-5",
  system: "M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01",
  notifications: "M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4",
  templates: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5",
  referral: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M19 8v6M16 11h6",
  payout: "M3 6h18v12H3zM3 10h18M7 15h4",
};
const icon = (href: string) => I[href.split("/").filter(Boolean).pop() ?? ""];

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
            {icon(it.href) && <svg className="side-i" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={icon(it.href)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            <span className="side-n">{it.label}</span>{it.badge ? <span className="tag accent">{it.badge}</span> : null}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
