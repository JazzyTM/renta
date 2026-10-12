import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { REVIEW_STATUS } from "@/lib/labels";
import { ActionForm } from "@/components/Forms";
import { replyReview } from "../actions";

export default async function Reviews() {
  const u = await requireUser("/cabinet/reviews");
  const list = await db.review.findMany({ where: { listing: { ownerId: u.id } }, include: { listing: true }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <h1 className="h1">Отзывы</h1>
      {!list.length && <p className="muted">Отзывов пока нет. Их оставляют гости после поездки по заявке.</p>}
      {list.map(r => (
        <div key={r.id} className="card-box stack">
          <div className="row between"><b>{r.authorName}, {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</b><span className={`tag ${REVIEW_STATUS[r.status][1]}`}>{REVIEW_STATUS[r.status][0]}</span></div>
          <div className="small muted">{r.listing.title} · {fmtDate(r.createdAt)}</div>
          <p style={{ whiteSpace: "pre-wrap" }}>{r.text}</p>
          <ActionForm action={replyReview.bind(null, r.id)} submit="Сохранить ответ">
            <textarea className="input" name="reply" rows={2} defaultValue={r.ownerReply ?? ""} placeholder="Ваш ответ увидят все" />
          </ActionForm>
        </div>
      ))}
    </>
  );
}
