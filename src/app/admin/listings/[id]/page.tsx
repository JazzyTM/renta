import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { fmtDateTime, fmtRange, fmtDate } from "@/lib/format";
import { LISTING_STATUS, MODERATION, BOOKING_STATUS, PROMO_TYPES } from "@/lib/labels";
import { ListingEditor } from "@/components/ListingEditor";
import { ActionForm, ConfirmButton } from "@/components/Forms";
import { listingAdmin, grantPromotion, deleteListing } from "../../actions";

export default async function AdminListing({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireStaff();
  const { id } = await params;
  const l = await db.listing.findUnique({ where: { id }, include: { owner: true, resort: true, promotions: { orderBy: { createdAt: "desc" }, take: 10 }, bookings: { orderBy: { createdAt: "desc" }, take: 10 }, complaints: { orderBy: { createdAt: "desc" } } } });
  if (!l) notFound();
  const log = await db.auditLog.findMany({ where: { entity: "Listing", entityId: id }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 30 });
  return (
    <>
      <div className="small"><Link href="/admin/listings">← Объявления</Link></div>
      <h1 className="h1">№{l.number}. {l.title}</h1>
      <div className="grid2">
        <div className="card-box stack"><b>Управление</b>
          <ActionForm action={listingAdmin.bind(null, id)}>
            <div className="grid2">
              <div className="field"><label>Статус</label><select className="input" name="status" defaultValue={l.status}>{Object.entries(LISTING_STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div>
              <div className="field"><label>Проверка</label><select className="input" name="moderation" defaultValue={l.moderation}>{Object.entries(MODERATION).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div>
            </div>
            <label className="check"><input type="checkbox" name="verified" defaultChecked={l.verified} /> Значок «Проверен»</label>
            <label className="check"><input type="checkbox" name="isFeatured" defaultChecked={l.isFeatured} /> Рекомендуем (на главной)</label>
            <div className="field"><label>SEO title</label><input className="input" name="seoTitle" defaultValue={l.seoTitle ?? ""} /></div>
            <div className="field"><label>SEO description</label><textarea className="input" name="seoDescription" rows={2} defaultValue={l.seoDescription ?? ""} /></div>
            <div className="field"><label>Передать другому владельцу (почта)</label><input className="input" name="ownerEmail" placeholder={l.owner.email ?? ""} /></div>
          </ActionForm></div>
        <div className="stack">
          <div className="card-box stack"><b>Хозяин</b>
            <div><Link href={`/admin/users/${l.ownerId}`}>{l.owner.name || "Без имени"}</Link>, {l.owner.email ?? "почта не указана"}</div>
            <div className="small muted">Просмотров {l.views}, показов телефона {l.phoneViews}, рейтинг {l.ratingAvg.toFixed(1)} ({l.ratingCount})</div>
            <div className="small muted">Создано {fmtDateTime(l.createdAt)}, опубликовано {l.publishedAt ? fmtDateTime(l.publishedAt) : "—"}</div>
          </div>
          {u.role === "ADMIN" && <div className="card-box stack"><b>Включить услугу бесплатно</b>
            <ActionForm action={grantPromotion.bind(null, id)} submit="Включить" className="row">
              <select className="input" name="type" style={{ width: "auto" }}>{Object.entries(PROMO_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <input className="input" name="days" type="number" defaultValue={7} style={{ width: 90 }} /> <span className="small">дней</span>
            </ActionForm>
            {l.promotions.map(p => <div key={p.id} className="small">{PROMO_TYPES[p.type]} до {fmtDate(p.endsAt)}</div>)}
          </div>}
          {l.complaints.length > 0 && <div className="card-box stack"><b>Жалобы</b>{l.complaints.map(c => <div key={c.id} className="small"><Link href="/admin/complaints">{c.reason}</Link>: {c.text}</div>)}</div>}
        </div>
      </div>
      {l.bookings.length > 0 && <div className="card-box stack"><b>Последние заявки</b>
        <div className="lines">{l.bookings.map(b => <div className="l" key={b.id}><Link href={`/admin/bookings/${b.number}`}>№{b.number} {b.guestName}, {fmtRange(b.checkIn, b.checkOut)}</Link><span className={`tag ${BOOKING_STATUS[b.status][1]}`}>{BOOKING_STATUS[b.status][0]}</span></div>)}</div></div>}
      <h2 className="h2">Содержимое объявления</h2>
      <ListingEditor id={id} />
      <div className="card-box stack"><b>История</b>
        <div className="lines">{log.map(a => <div className="l" key={a.id}><span>{a.user?.email ?? "система"}: {a.action}</span><span className="small muted">{fmtDateTime(a.createdAt)}</span></div>)}</div></div>
      {u.role === "ADMIN" && <form action={deleteListing.bind(null, id)}><ConfirmButton className="btn danger sm" message="Удалить объявление? Если по нему были заявки, оно уйдёт в архив.">Удалить объявление</ConfirmButton></form>}
    </>
  );
}
