import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { expirePromotions } from "@/lib/payments";
import { fmtDateTime, isoDate, rub, fmtDate } from "@/lib/format";

export const metadata = { title: "Сводка" };

export default async function Dashboard() {
  await requireStaff();
  await expirePromotions();
  const day = new Date(Date.now() - 86400000), week = new Date(Date.now() - 7 * 86400000), from = new Date(Date.now() - 29 * 86400000);
  from.setUTCHours(0, 0, 0, 0);
  const [published, pending, drafts, users, owners, newUsersWeek, bookingsDay, bookingsWeek, newBookings, revenue, complaints, reviews, recent, daily, phoneWeek, viewsWeek, topResorts] = await Promise.all([
    db.listing.count({ where: { status: "PUBLISHED" } }),
    db.listing.count({ where: { status: "PUBLISHED", moderation: "PENDING" } }),
    db.listing.count({ where: { status: "DRAFT" } }),
    db.user.count(), db.user.count({ where: { listings: { some: {} } } }), db.user.count({ where: { createdAt: { gte: week } } }),
    db.booking.count({ where: { createdAt: { gte: day } } }), db.booking.count({ where: { createdAt: { gte: week } } }), db.booking.count({ where: { status: "NEW" } }),
    db.order.aggregate({ where: { status: "PAID", paidAt: { gte: new Date(Date.now() - 30 * 86400000) } }, _sum: { amount: true } }),
    db.complaint.count({ where: { status: "OPEN" } }), db.review.count({ where: { status: "PENDING" } }),
    db.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.$queryRaw<{ d: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt") AS d, count(*) AS n FROM "Booking" WHERE "createdAt" >= ${from} GROUP BY 1 ORDER BY 1`,
    db.listingStatDaily.aggregate({ where: { date: { gte: week } }, _sum: { phoneViews: true } }),
    db.listingStatDaily.aggregate({ where: { date: { gte: week } }, _sum: { views: true } }),
    db.resort.findMany({ select: { name: true, slug: true, _count: { select: { listings: { where: { status: "PUBLISHED" } } } } }, orderBy: { listings: { _count: "desc" } }, take: 8 }),
  ]);
  const map = new Map(daily.map(r => [isoDate(r.d), Number(r.n)]));
  const series = Array.from({ length: 30 }, (_, i) => { const d = new Date(from.getTime() + i * 86400000); return { d, n: map.get(isoDate(d)) ?? 0 }; });
  const max = Math.max(1, ...series.map(x => x.n));
  const S = ({ n, t, href }: { n: number | string; t: string; href?: string }) => href ? <Link className="stat" href={href}><b>{n}</b><span>{t}</span></Link> : <div className="stat"><b>{n}</b><span>{t}</span></div>;
  return (
    <>
      <h1 className="h1">Сводка</h1>
      <div className="stats">
        <S n={pending} t="ждут модерации" href="/admin/moderation" />
        <S n={newBookings} t="заявок без ответа" href="/admin/bookings?status=NEW" />
        <S n={complaints} t="новых жалоб" href="/admin/complaints" />
        <S n={reviews} t="отзывов на проверке" href="/admin/reviews" />
      </div>
      <div className="stats">
        <S n={published} t="объявлений на сайте" href="/admin/listings?status=PUBLISHED" />
        <S n={drafts} t="черновиков" href="/admin/listings?status=DRAFT" />
        <S n={users} t={`пользователей, хозяев ${owners}`} href="/admin/users" />
        <S n={newUsersWeek} t="регистраций за неделю" />
        <S n={bookingsDay} t="заявок за сутки" />
        <S n={bookingsWeek} t="заявок за неделю" />
        <S n={viewsWeek._sum.views ?? 0} t="просмотров объявлений за неделю" />
        <S n={phoneWeek._sum.phoneViews ?? 0} t="показов телефона за неделю" />
        <S n={rub(revenue._sum.amount ?? 0)} t="оплачено за 30 дней" href="/admin/orders" />
      </div>
      <div className="grid2">
        <div className="card-box stack"><b>Заявки за 30 дней</b>
          <div className="bar">{series.map(x => <i key={x.d.toISOString()} style={{ height: `${(x.n / max) * 100}%` }} title={`${fmtDate(x.d)}: ${x.n}`} />)}</div></div>
        <div className="card-box stack"><b>Курорты с наибольшим числом объявлений</b>
          <div className="lines">{topResorts.map(r => <div className="l" key={r.slug}><Link href={`/admin/listings?resort=${r.slug}`}>{r.name}</Link><span className="num">{r._count.listings}</span></div>)}</div></div>
      </div>
      <div className="card-box stack"><div className="row between"><b>Последние действия</b><Link className="small" href="/admin/audit">Весь журнал</Link></div>
        <div className="lines">{recent.map(a => <div className="l" key={a.id}><span>{a.user?.email ?? "система"}: {a.action} {a.entity}</span><span className="small muted">{fmtDateTime(a.createdAt)}</span></div>)}</div></div>
    </>
  );
}
