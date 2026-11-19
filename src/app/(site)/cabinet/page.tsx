import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ownerPlan } from "@/lib/plan";
import { rub, fmtDate } from "@/lib/format";
import { thumb } from "@/lib/img";
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
        <div className="olist">{listings.map(l => {
          const href = `/cabinet/listings/${l.id}`;
          return (
            <div key={l.id} className="oitem">
              <Link href={href} className="oi-ph" tabIndex={-1} aria-hidden="true">{l.photos[0] ? <img src={thumb(l.photos[0].url)} alt="" loading="lazy" /> : <span className="oi-nophoto">нет фото</span>}</Link>
              <div className="oi-b">
                <Link href={href} className="oi-t">{l.title}</Link>
                <div className="small muted">№{l.number} · {LISTING_TYPES[l.type]} · {l.resort.name}</div>
                <div className="oi-tags"><span className={`tag ${LISTING_STATUS[l.status][1]}`}>{LISTING_STATUS[l.status][0]}</span>{l.status === "PUBLISHED" && <span className={`tag ${MODERATION[l.moderation][1]}`}>{MODERATION[l.moderation][0]}</span>}</div>
              </div>
              <dl className="oi-s">
                <div><dt>Цена от</dt><dd className="num">{l.priceFrom ? rub(l.priceFrom) : "—"}</dd></div>
                <div><dt>Просмотры</dt><dd className="num">{l.views}</dd></div>
                <div><dt>Телефон</dt><dd className="num">{l.phoneViews}</dd></div>
                <div><dt>Заявки</dt><dd>{l._count.bookings ? <Link href="/cabinet/bookings?status=NEW" className="tag warn">{l._count.bookings} новых</Link> : "—"}</dd></div>
              </dl>
              <Link href={href} className="btn ghost sm oi-e">Изменить</Link>
            </div>
          );
        })}</div>
      ) : (
        <div className="card-box stack"><b>У вас пока нет объявлений</b><p className="muted">Добавьте объект: название, курорт, фото и цены. Остальное можно заполнить позже.</p><div><Link className="btn" href="/cabinet/new">Добавить объект</Link></div></div>
      )}
    </>
  );
}
