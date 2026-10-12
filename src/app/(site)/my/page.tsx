import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtRange } from "@/lib/format";
import { BOOKING_STATUS } from "@/lib/labels";
import { cardInclude } from "@/lib/queries";
import { ListingCard } from "@/components/ListingCard";

export const metadata = { title: "Мои поездки" };

export default async function My() {
  const u = await requireUser("/my");
  const [bookings, favs] = await Promise.all([
    db.booking.findMany({ where: { OR: [{ guestId: u.id }, ...(u.email ? [{ guestEmail: u.email }] : [])] }, include: { listing: true }, orderBy: { createdAt: "desc" } }),
    db.favorite.findMany({ where: { userId: u.id }, include: { listing: { include: cardInclude } } }),
  ]);
  return (
    <main className="wrap" style={{ paddingBlock: 24, display: "grid", gap: 28 }}>
      <section className="stack"><h1 className="h1">Мои заявки</h1>
        {bookings.length ? <div className="tablewrap"><table className="t"><thead><tr><th>№</th><th>Объект</th><th>Даты</th><th>Статус</th></tr></thead><tbody>
          {bookings.map(b => <tr key={b.id}><td><Link href={`/b/${b.number}`}>{b.number}</Link></td><td>{b.listing.title}</td><td>{fmtRange(b.checkIn, b.checkOut)}</td><td><span className={`tag ${BOOKING_STATUS[b.status][1]}`}>{BOOKING_STATUS[b.status][0]}</span></td></tr>)}
        </tbody></table></div> : <p className="muted">Заявок пока нет.</p>}</section>
      <section className="stack"><h2 className="h2">Избранное</h2>
        {favs.length ? <div className="cards">{favs.map(f => <ListingCard key={f.listingId} l={f.listing} />)}</div> : <p className="muted">Пока пусто.</p>}</section>
    </main>
  );
}
