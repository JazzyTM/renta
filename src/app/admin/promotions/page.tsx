import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, rub } from "@/lib/format";
import { PROMO_TYPES } from "@/lib/labels";
import { endPromotion } from "../actions";

export const metadata = { title: "Активные услуги" };

export default async function Promotions() {
  await requireAdmin();
  const list = await db.promotion.findMany({ where: { endsAt: { gt: new Date() } }, include: { listing: { include: { resort: true } } }, orderBy: { endsAt: "asc" } });
  return (
    <>
      <h1 className="h1">Активные услуги</h1>
      <p className="muted">Включить услугу бесплатно можно на странице объявления.</p>
      {!list.length ? <p className="muted">Нет активных услуг.</p> :
      <div className="tablewrap"><table className="t"><thead><tr><th>Услуга</th><th>Объявление</th><th>С</th><th>До</th><th>Цена</th><th></th></tr></thead><tbody>
        {list.map(p => <tr key={p.id}><td>{PROMO_TYPES[p.type]}</td><td><Link href={`/admin/listings/${p.listingId}`}>{p.listing.title}</Link><div className="small muted">{p.listing.resort.name}</div></td>
          <td>{fmtDate(p.startsAt)}</td><td>{fmtDate(p.endsAt)}</td><td className="num">{p.price ? rub(p.price) : "бесплатно"}</td>
          <td><form action={endPromotion.bind(null, p.id)}><button className="btn ghost sm">Остановить</button></form></td></tr>)}
      </tbody></table></div>}
    </>
  );
}
