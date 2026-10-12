import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { fmtDateTime, rub } from "@/lib/format";
import { LISTING_TYPES } from "@/lib/labels";
import { ActionForm } from "@/components/Forms";
import { moderate } from "../actions";

export const metadata = { title: "Модерация" };

export default async function Moderation({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff();
  const tab = (await searchParams).tab === "changes" ? "changes" : "pending";
  const where = tab === "pending" ? { status: "PUBLISHED" as const, moderation: "PENDING" as const } : { moderation: { in: ["CHANGES_REQUESTED" as const, "REJECTED" as const] }, status: { not: "ARCHIVED" as const } };
  const [list, words] = await Promise.all([
    db.listing.findMany({ where, include: { photos: { orderBy: { sort: "asc" }, take: 6 }, resort: true, owner: true, prices: true, _count: { select: { complaints: true, photos: true } } }, orderBy: { updatedAt: "asc" }, take: 30 }),
    db.stopWord.findMany(),
  ]);
  return (
    <>
      <h1 className="h1">Модерация</h1>
      <div className="row"><Link className={`chip${tab === "pending" ? " on" : ""}`} href="/admin/moderation">Новые и изменённые</Link><Link className={`chip${tab === "changes" ? " on" : ""}`} href="/admin/moderation?tab=changes">Отправлены на доработку</Link></div>
      {!list.length && <p className="muted">Очередь пуста.</p>}
      {list.map(l => {
        const text = (l.title + " " + l.description).toLowerCase();
        const hits = words.filter(w => text.includes(w.word.toLowerCase())).map(w => w.word);
        return (
          <div key={l.id} className="card-box stack">
            <div className="row between">
              <div><Link href={`/admin/listings/${l.id}`}><b>{l.title}</b></Link> <span className="small muted">№{l.number} · {LISTING_TYPES[l.type]} · {l.resort.name}</span></div>
              <span className="small muted">изменено {fmtDateTime(l.updatedAt)}</span>
            </div>
            <div className="small">Хозяин: <Link href={`/admin/users/${l.ownerId}`}>{l.owner.name || l.owner.email}</Link> · тел. {l.contactPhone || "—"} · фото {l._count.photos} · цена от {rub(l.priceFrom)}{l.seaDistance != null ? ` · ${l.seaDistance} м до моря` : ""}</div>
            {hits.length > 0 && <div className="notice bad">Стоп-слова: {hits.join(", ")}</div>}
            {l._count.complaints > 0 && <div className="notice bad">Жалоб: {l._count.complaints}</div>}
            {l.moderationNote && <div className="notice">Заметка: {l.moderationNote}</div>}
            <div className="row" style={{ gap: 6 }}>{l.photos.map(p => <img key={p.id} src={p.url} alt="" style={{ width: 120, height: 84, objectFit: "cover", borderRadius: 8 }} />)}</div>
            <p className="small" style={{ whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto" }}>{l.description || <i className="muted">Нет описания</i>}</p>
            <div className="grid2">
              <ActionForm action={moderate.bind(null, l.id, "APPROVED")} submit="Одобрить" className="row">
                <label className="check"><input type="checkbox" name="verified" /> Отметить «Проверен»</label>
              </ActionForm>
              <ActionForm action={moderate.bind(null, l.id, "CHANGES_REQUESTED")} submit="На доработку" className="row">
                <input className="input" name="note" placeholder="Что исправить (увидит хозяин)" style={{ flex: 1 }} />
              </ActionForm>
            </div>
            <div className="grid2">
              <ActionForm action={moderate.bind(null, l.id, "REJECTED")} submit="Отклонить и скрыть" className="row">
                <input className="input" name="note" placeholder="Причина" style={{ flex: 1 }} />
              </ActionForm>
              <ActionForm action={moderate.bind(null, l.id, "BLOCK")} submit="Заблокировать" className="row">
                <input className="input" name="note" placeholder="Причина блокировки" style={{ flex: 1 }} />
              </ActionForm>
            </div>
          </div>
        );
      })}
    </>
  );
}
