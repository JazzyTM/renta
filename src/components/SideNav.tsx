"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; badge?: number } | { group: string };

export function SideNav({ items, root }: { items: NavItem[]; root: string }) {
  const path = usePathname();
  return (
    <aside className="side">
      {items.map((it, i) => "group" in it ? <div className="grp" key={i}>{it.group}</div> : (
        <Link key={it.href} href={it.href} className={(it.href === root ? path === root : path.startsWith(it.href)) ? "on" : ""}>
          {it.label}{it.badge ? <span className="tag accent">{it.badge}</span> : null}
        </Link>
      ))}
    </aside>
  );
}
