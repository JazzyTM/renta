import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { SideNav, type NavItem } from "@/components/SideNav";
import { LogoMark } from "@/components/Logo";
import { CRUD } from "@/lib/crud";

export const metadata = { title: { default: "Админка", template: "%s · Админка" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireStaff();
  const admin = u.role === "ADMIN";
  const [mod, bookings, reviews, complaints, orders, s] = await Promise.all([
    db.listing.count({ where: { status: "PUBLISHED", moderation: "PENDING" } }),
    db.booking.count({ where: { status: "NEW" } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.complaint.count({ where: { status: "OPEN" } }),
    db.order.count({ where: { status: "PENDING" } }),
    getSettings(),
  ]);
  const c = (k: string) => ({ href: `/admin/c/${k}`, label: CRUD[k].title });
  const items: NavItem[] = [
    { href: "/admin", label: "Сводка" },
    { group: "Работа" },
    { href: "/admin/moderation", label: "Модерация", badge: mod },
    { href: "/admin/listings", label: "Объявления" },
    { href: "/admin/bookings", label: "Заявки", badge: bookings },
    { href: "/admin/reviews", label: "Отзывы", badge: reviews },
    { href: "/admin/complaints", label: "Жалобы", badge: complaints },
    { href: "/admin/users", label: "Пользователи" },
    { group: "Справочники" },
    c("regions"), c("resorts"), c("beaches"), c("amenities"), c("stopwords"),
    { group: "Контент" },
    c("pages"), c("articles"), c("banners"), c("seopages"),
    ...(admin ? [
      { group: "Деньги" },
      { href: "/admin/orders", label: "Заказы", badge: orders },
      c("tariffs"), c("promocodes"),
      { href: "/admin/promotions", label: "Активные услуги" },
      { group: "Рассылки и письма" },
      { href: "/admin/campaigns", label: "Рассылки" },
      { href: "/admin/emails", label: "Шаблоны писем" },
      { href: "/admin/emaillog", label: "Журнал писем" },
      { group: "Система" },
      { href: "/admin/settings", label: "Настройки" },
      c("redirects"),
      { href: "/admin/audit", label: "Журнал действий" },
      { href: "/admin/updates", label: "Обновления" },
      { href: "/admin/system", label: "Сервер и резервные копии" },
    ] as NavItem[] : []),
  ];
  return (
    <>
      <header className="top"><div className="wrap" style={{ maxWidth: "none" }}>
        <Link href="/admin" className="logo"><LogoMark />{String(s.siteName).toLowerCase()} · админка</Link>
        <nav><Link className="navlink" href="/" target="_blank">Открыть сайт</Link><Link className="navlink" href="/account">{u.name || u.email}</Link></nav>
      </div></header>
      <div className="shell"><SideNav root="/admin" items={items} /><div className="main">{children}</div></div>
    </>
  );
}
