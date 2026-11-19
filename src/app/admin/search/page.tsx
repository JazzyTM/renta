import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { fmtDate, fmtRange, rub } from "@/lib/format";
import { BOOKING_STATUS, LISTING_STATUS } from "@/lib/labels";

export const metadata = { title: "Поиск" };

// Поиск по всей админке: объявления, пользователи, заявки, заказы, курорты
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireStaff();
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const n = /^\d{1,9}$/.test(q.replace(/^№/, "")) ? Number(q.replace(/^№/, "")) : null;
  const digits = q.replace(/\D/g, "");
  const ci = { contains: q, mode: "insensitive" as const };
  const empty = q.length < 2 && n === null;
  const [listings, users, bookings, orders, resorts] = empty ? [[], [], [], [], []] : await Promise.all([
    db.listing.findMany({ where: { OR: [{ title: ci }, { address: ci }, ...(digits.length >= 5 ? [{ contactPhone: { contains: digits.slice(-7) } }] : []), ...(n !== null ? [{ number: n }] : []), { owner: { email: ci } }] }, include: { resort: true, owner: true }, take: 20, orderBy: { updatedAt: "desc" } }),
    db.user.findMany({ where: { OR: [{ email: ci }, { name: ci }, ...(digits.length >= 5 ? [{ phone: { contains: digits.slice(-7) } }] : []), { id: q }] }, take: 20, orderBy: { createdAt: "desc" } }),
    db.booking.findMany({ where: { OR: [{ guestName: ci }, { guestEmail: ci }, ...(digits.length >= 5 ? [{ guestPhone: { contains: digits.slice(-7) } }] : []), ...(n !== null ? [{ number: n }] : [])] }, include: { listing: true }, take: 20, orderBy: { createdAt: "desc" } }),
    me.role === "ADMIN" ? db.order.findMany({ where: { OR: [...(n !== null ? [{ number: n }] : []), { promoCode: ci }, { user: { email: ci } }] }, include: { user: true }, take: 20, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    db.resort.findMany({ where: { OR: [{ name: ci }, { slug: ci }] }, take: 10 }),
  ]);
  const total = listings.length + users.length + bookings.length + orders.length + resorts.length;
  const Sec = ({ t, c, children }: { t: string; c: number; children: React.ReactNode }) => c ? <section className="card-box stack"><h2 className="h2">{t} <span className="muted small">{c}</span></h2><div className="slist">{children}</div></section> : null;
  return (
    <>
      <h1 className="h1">Поиск</h1>
      <form className="toolbar" action="/admin/search">
        <input className="input" name="q" defaultValue={q} placeholder="Номер, название, почта, имя, телефон, промокод" autoFocus style={{ flex: 1, minWidth: 240 }} />
        <button className="btn sm">Найти</button>
      </form>
      {empty ? <p className="muted">Введите хотя бы 2 символа или номер объявления, заявки, заказа.</p> : !total ? <p className="muted">Ничего не нашлось по запросу «{q}».</p> : <>
        <Sec t="Объявления" c={listings.length}>{listings.map(l => <Link key={l.id} href={`/admin/listings/${l.id}`} className="srow"><b>№{l.number} · {l.title}</b><span>{l.resort.name} · {l.owner.email ?? l.owner.name} · <span className={`tag ${LISTING_STATUS[l.status][1]}`}>{LISTING_STATUS[l.status][0]}</span></span></Link>)}</Sec>
        <Sec t="Заявки" c={bookings.length}>{bookings.map(b => <Link key={b.id} href={`/admin/bookings/${b.number}`} className="srow"><b>№{b.number} · {b.guestName}</b><span>{b.listing.title} · {fmtRange(b.checkIn, b.checkOut)} · <span className={`tag ${BOOKING_STATUS[b.status][1]}`}>{BOOKING_STATUS[b.status][0]}</span></span></Link>)}</Sec>
        <Sec t="Пользователи" c={users.length}>{users.map(x => <Link key={x.id} href={`/admin/users/${x.id}`} className="srow"><b>{x.name || x.email}</b><span>{x.email}{x.phone ? ` · ${x.phone}` : ""} · с {fmtDate(x.createdAt)}</span></Link>)}</Sec>
        <Sec t="Заказы" c={orders.length}>{orders.map(o => <Link key={o.id} href="/admin/orders" className="srow"><b>Заказ №{o.number} · {rub(o.amount)}</b><span>{o.user.email} · {o.status}{o.promoCode ? ` · промокод ${o.promoCode}` : ""}</span></Link>)}</Sec>
        <Sec t="Курорты" c={resorts.length}>{resorts.map(r => <Link key={r.id} href={`/admin/c/resorts/${r.id}`} className="srow"><b>{r.name}</b><span>/kurort/{r.slug}</span></Link>)}</Sec>
      </>}
    </>
  );
}
