import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtRange, fmtDateTime, rub } from "@/lib/format";
import { BOOKING_STATUS } from "@/lib/labels";

export default async function Bookings({ searchParams }: { searchParams: Promise<{ status?: string; listing?: string }> }) {
  const u = await requireUser("/cabinet/bookings");
  const sp = await searchParams;
  const status = sp.status && sp.status in BOOKING_STATUS ? sp.status : undefined;
  const [list, listings, counts] = await Promise.all([
    db.booking.findMany({ where: { listing: { ownerId: u.id }, status: status as any, listingId: sp.listing || undefined }, include: { listing: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.listing.findMany({ where: { ownerId: u.id }, select: { id: true, title: true } }),
    db.booking.groupBy({ by: ["status"], where: { listing: { ownerId: u.id } }, _count: true }),
  ]);
  const cnt = Object.fromEntries(counts.map(c => [c.status, c._count]));
  const q = (st?: string) => `/cabinet/bookings${st ? `?status=${st}` : ""}`;
  return (
    <>
      <h1 className="h1">Заявки</h1>
      <div className="row">
        <Link className={`chip${!status ? " on" : ""}`} href={q()}>Все</Link>
        {Object.entries(BOOKING_STATUS).map(([k, [t]]) => <Link key={k} className={`chip${status === k ? " on" : ""}`} href={q(k)}>{t}{cnt[k] ? ` · ${cnt[k]}` : ""}</Link>)}
      </div>
      {listings.length > 1 && <form className="toolbar">{status && <input type="hidden" name="status" value={status} />}
        <select className="input" name="listing" defaultValue={sp.listing ?? ""}><option value="">Все объекты</option>{listings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
        <button className="btn ghost sm">Показать</button></form>}
      {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>№</th><th>Гость</th><th>Объект</th><th>Даты</th><th>Сумма</th><th>Статус</th><th>Пришла</th></tr></thead><tbody>
        {list.map(b => <tr key={b.id}>
          <td><Link href={`/cabinet/bookings/${b.number}`}>{b.number}</Link></td>
          <td>{b.guestName}<div className="small muted">{b.adults + b.children} гост.</div></td>
          <td>{b.listing.title}</td>
          <td>{fmtRange(b.checkIn, b.checkOut)}</td>
          <td className="num">{rub(b.totalEstimate)}</td>
          <td><span className={`tag ${BOOKING_STATUS[b.status][1]}`}>{BOOKING_STATUS[b.status][0]}</span></td>
          <td className="small muted">{fmtDateTime(b.createdAt)}</td>
        </tr>)}
      </tbody></table></div> : <p className="muted">Заявок нет.</p>}
    </>
  );
}
