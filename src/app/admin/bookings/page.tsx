import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { fmtRange, fmtDateTime, rub } from "@/lib/format";
import { BOOKING_STATUS } from "@/lib/labels";
import { Pager } from "@/components/admin/Pager";
import { bookingRemind } from "../actions";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Заявки" };
const TAKE = 50;

export default async function Bookings({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const and: Prisma.BookingWhereInput[] = [];
  if (sp.q) { const n = Number(sp.q); and.push({ OR: [{ guestName: { contains: sp.q, mode: "insensitive" } }, { guestEmail: { contains: sp.q, mode: "insensitive" } }, { guestPhone: { contains: sp.q } }, { listing: { title: { contains: sp.q, mode: "insensitive" } } }, ...(Number.isInteger(n) ? [{ number: n }] : [])] }); }
  if (sp.status) and.push({ status: sp.status as any });
  if (sp.from) and.push({ checkIn: { gte: new Date(sp.from) } });
  if (sp.to) and.push({ checkIn: { lte: new Date(sp.to) } });
  const where = { AND: and };
  const s = await getSettings();
  const late = new Date(Date.now() - Number(s.responseHours) * 3600000);
  const [list, total, lateCount] = await Promise.all([
    db.booking.findMany({ where, include: { listing: { include: { resort: true } } }, orderBy: { createdAt: "desc" }, take: TAKE, skip: (page - 1) * TAKE }),
    db.booking.count({ where }),
    db.booking.count({ where: { status: "NEW", createdAt: { lt: late } } }),
  ]);
  return (
    <>
      <h1 className="h1">Заявки</h1>
      {lateCount > 0 && <div className="notice bad row between"><span>{lateCount} заявок без ответа дольше {s.responseHours} ч.</span><form action={bookingRemind}><button className="btn sm">Напомнить хозяевам</button></form></div>}
      <form className="toolbar">
        <input className="input" name="q" defaultValue={sp.q} placeholder="Номер, гость, почта, телефон, объект" style={{ minWidth: 260 }} />
        <select className="input" name="status" defaultValue={sp.status ?? ""}><option value="">Любой статус</option>{Object.entries(BOOKING_STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
        <label className="small">Заезд с <input className="input" type="date" name="from" defaultValue={sp.from} /></label>
        <label className="small">по <input className="input" type="date" name="to" defaultValue={sp.to} /></label>
        <button className="btn ghost sm">Найти</button>
        <a className="btn ghost sm" href={`/admin/export/bookings?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`}>Скачать CSV</a>
      </form>
      <div className="small muted">Найдено: {total}</div>
      <div className="tablewrap"><table className="t"><thead><tr><th>№</th><th>Гость</th><th>Объект</th><th>Даты</th><th>Сумма</th><th>Статус</th><th>Создана</th></tr></thead><tbody>
        {list.map(b => <tr key={b.id}>
          <td><Link href={`/admin/bookings/${b.number}`}>{b.number}</Link></td>
          <td>{b.guestName}<div className="small muted">{b.guestEmail}{b.guestPhone ? `, ${b.guestPhone}` : ""}</div></td>
          <td><Link href={`/admin/listings/${b.listingId}`}>{b.listing.title}</Link><div className="small muted">{b.listing.resort.name}</div></td>
          <td>{fmtRange(b.checkIn, b.checkOut)}</td><td className="num">{rub(b.totalEstimate)}</td>
          <td><span className={`tag ${BOOKING_STATUS[b.status][1]}`}>{BOOKING_STATUS[b.status][0]}</span></td>
          <td className="small muted">{fmtDateTime(b.createdAt)}</td>
        </tr>)}
      </tbody></table></div>
      <Pager page={page} pages={Math.ceil(total / TAKE)} sp={sp} path="/admin/bookings" />
    </>
  );
}
