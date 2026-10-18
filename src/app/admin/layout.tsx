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
  const [mod, bookings, reviews, complaints, orders, s, ids] = await Promise.all([
    db.listing.count({ where: { status: "PUBLISHED", moderation: "PENDING" } }),
    db.booking.count({ where: { status: "NEW" } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.complaint.count({ where: { status: "OPEN" } }),
    db.order.count({ where: { status: "PENDING" } }),
    getSettings(),
    db.user.count({ where: { idStatus: "PENDING" } }),
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
    { href: "/admin/idcheck", label: "Проверка личности", badge: ids },
    { group: "Аналитика" },
    { href: "/admin/demand", label: "Спрос по курортам" },
    { href: "/admin/experiments", label: "A/B-тесты" },
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
        <Link href="/admin" className="logo alogo"><LogoMark size={28} /><span>{s.siteName}</span><span className="alogo-t">Админка</span></Link>
        <nav>
          <Link className="obtn alink" href="/" target="_blank"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="obtn-t">Открыть сайт</span></Link>
          <Link className="auser hide-sm" href="/account"><span className="avatar">{(u.name || u.email || "?").trim()[0]?.toUpperCase()}</span><span>{u.name || u.email}</span></Link>
        </nav>
      </div></header>
      <div className="shell"><SideNav root="/admin" items={items} /><div className="main">{children}</div></div>
    </>
  );
}
