import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ownerPlan } from "@/lib/plan";
import { rub, fmtDate } from "@/lib/format";
import { LISTING_STATUS, MODERATION, LISTING_TYPES } from "@/lib/labels";

export default async function Cabinet() {
  const u = await requireUser("/cabinet");
  const [listings, plan] = await Promise.all([
    db.listing.findMany({ where: { ownerId: u.id, status: { not: "ARCHIVED" } }, include: { resort: true, photos: { take: 1, orderBy: { sort: "asc" } }, _count: { select: { bookings: { where: { status: "NEW" } } } } }, orderBy: { createdAt: "desc" } }),
    ownerPlan(u.id),
  ]);
  return (
    <>
      <div className="row between"><h1 className="h1">Мои объекты</h1><Link className="btn" href="/cabinet/new">Добавить объект</Link></div>
      <div className="notice">Тариф: <b>{plan.name}</b>{plan.free && plan.freeUntil ? `, бесплатно до ${fmtDate(plan.freeUntil)}` : ""}. Объявлений: {listings.length} из {plan.maxListings}. <Link href="/cabinet/tariff">Подробнее</Link></div>
      {listings.length ? (
        <div className="tablewrap"><table className="t"><thead><tr><th></th><th>Объект</th><th>Статус</th><th>Цена от</th><th>Просмотры</th><th>Телефон</th><th>Новые заявки</th></tr></thead><tbody>
          {listings.map(l => (
            <tr key={l.id}>
              <td style={{ width: 72 }}>{l.photos[0] ? <img src={l.photos[0].url} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6 }} /> : null}</td>
              <td><Link href={`/cabinet/listings/${l.id}`}><b>{l.title}</b></Link><div className="small muted">№{l.number} · {LISTING_TYPES[l.type]} · {l.resort.name}</div></td>
              <td><div className="row"><span className={`tag ${LISTING_STATUS[l.status][1]}`}>{LISTING_STATUS[l.status][0]}</span>{l.status === "PUBLISHED" && <span className={`tag ${MODERATION[l.moderation][1]}`}>{MODERATION[l.moderation][0]}</span>}</div></td>
              <td className="num">{l.priceFrom ? rub(l.priceFrom) : "—"}</td>
              <td className="num">{l.views}</td>
              <td className="num">{l.phoneViews}</td>
              <td>{l._count.bookings ? <Link href="/cabinet/bookings?status=NEW"><span className="tag warn">{l._count.bookings}</span></Link> : "—"}</td>
            </tr>
          ))}
        </tbody></table></div>
      ) : (
        <div className="card-box stack"><b>У вас пока нет объявлений</b><p className="muted">Добавьте объект: название, курорт, фото и цены. Остальное можно заполнить позже.</p><div><Link className="btn" href="/cabinet/new">Добавить объект</Link></div></div>
      )}
    </>
  );
}
