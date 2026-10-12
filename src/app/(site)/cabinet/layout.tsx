import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SideNav } from "@/components/SideNav";

export const metadata = { title: "Кабинет хозяина", robots: { index: false } };

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser("/cabinet");
  const [newReq, unread] = await Promise.all([
    db.booking.count({ where: { listing: { ownerId: u.id }, status: "NEW" } }),
    db.notification.count({ where: { userId: u.id, readAt: null } }),
  ]);
  return (
    <div className="shell">
      <SideNav root="/cabinet" items={[
        { href: "/cabinet", label: "Мои объекты" },
        { href: "/cabinet/bookings", label: "Заявки", badge: newReq },
        { href: "/cabinet/stats", label: "Статистика" },
        { href: "/cabinet/reviews", label: "Отзывы" },
        { href: "/cabinet/notifications", label: "Уведомления", badge: unread },
        { group: "Деньги" },
        { href: "/cabinet/tariff", label: "Тариф и продвижение" },
        { href: "/cabinet/payout", label: "Реквизиты" },
      ]} />
      <div className="main">{children}</div>
    </div>
  );
}
