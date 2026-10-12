import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { REVIEW_STATUS } from "@/lib/labels";
import { reviewSet } from "../actions";

export const metadata = { title: "Отзывы" };

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff();
  const status = (await searchParams).status ?? "PENDING";
  const list = await db.review.findMany({ where: status === "all" ? {} : { status: status as any }, include: { listing: true, booking: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <h1 className="h1">Отзывы</h1>
      <div className="row">{[["PENDING", "На проверке"], ["PUBLISHED", "Опубликованы"], ["HIDDEN", "Скрыты"], ["all", "Все"]].map(([k, t]) => <Link key={k} className={`chip${status === k ? " on" : ""}`} href={`/admin/reviews?status=${k}`}>{t}</Link>)}</div>
      {!list.length && <p className="muted">Пусто.</p>}
      {list.map(r => (
        <div key={r.id} className="card-box stack">
          <div className="row between"><b>{r.authorName}, {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</b><span className={`tag ${REVIEW_STATUS[r.status][1]}`}>{REVIEW_STATUS[r.status][0]}</span></div>
          <div className="small muted"><Link href={`/admin/listings/${r.listingId}`}>{r.listing.title}</Link>{r.booking ? <> · <Link href={`/admin/bookings/${r.booking.number}`}>заявка №{r.booking.number}</Link></> : " · без заявки"} · {fmtDateTime(r.createdAt)}</div>
          <p style={{ whiteSpace: "pre-wrap" }}>{r.text}</p>
          {r.ownerReply && <p className="small muted">Ответ хозяина: {r.ownerReply}</p>}
          <div className="row">
            {r.status !== "PUBLISHED" && <form action={reviewSet.bind(null, r.id, "PUBLISHED")}><button className="btn sm okb">Опубликовать</button></form>}
            {r.status !== "HIDDEN" && <form action={reviewSet.bind(null, r.id, "HIDDEN")}><button className="btn ghost sm">Скрыть</button></form>}
            <form action={reviewSet.bind(null, r.id, "DELETE")}><button className="btn ghost sm">Удалить</button></form>
          </div>
        </div>
      ))}
    </>
  );
}
