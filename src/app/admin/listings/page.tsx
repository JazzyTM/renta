import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { rub, fmtDate } from "@/lib/format";
import { LISTING_STATUS, MODERATION, LISTING_TYPES } from "@/lib/labels";
import { Pager } from "@/components/admin/Pager";
import { bulkListings } from "../actions";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Объявления" };
const TAKE = 50;

export default async function Listings({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const and: Prisma.ListingWhereInput[] = [];
  if (sp.q) { const n = Number(sp.q); and.push({ OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { address: { contains: sp.q, mode: "insensitive" } }, { contactPhone: { contains: sp.q } }, { owner: { email: { contains: sp.q, mode: "insensitive" } } }, ...(Number.isInteger(n) ? [{ number: n }] : [])] }); }
  if (sp.status) and.push({ status: sp.status as any });
  if (sp.moderation) and.push({ moderation: sp.moderation as any });
  if (sp.type) and.push({ type: sp.type as any });
  if (sp.resort) and.push({ resort: { slug: sp.resort } });
  if (sp.owner) and.push({ ownerId: sp.owner });
  if (sp.verified === "1") and.push({ verified: true });
  if (sp.nophoto === "1") and.push({ photos: { none: {} } });
  const where = { AND: and };
  const order: Record<string, Prisma.ListingOrderByWithRelationInput> = { new: { createdAt: "desc" }, upd: { updatedAt: "desc" }, views: { views: "desc" }, price: { priceFrom: "asc" } };
  const [list, total, resorts] = await Promise.all([
    db.listing.findMany({ where, include: { resort: true, owner: true, _count: { select: { bookings: true, photos: true, complaints: true } } }, orderBy: order[sp.sort ?? "new"] ?? order.new, take: TAKE, skip: (page - 1) * TAKE }),
    db.listing.count({ where }),
    db.resort.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);
  const sel = (name: string, opts: [string, string][], all: string) => <select className="input" name={name} defaultValue={sp[name] ?? ""}><option value="">{all}</option>{opts.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>;
  return (
    <>
      <h1 className="h1">Объявления</h1>
      <form className="toolbar">
        <input className="input" name="q" defaultValue={sp.q} placeholder="Номер, название, телефон, почта хозяина" style={{ minWidth: 260 }} />
        {sel("status", Object.entries(LISTING_STATUS).map(([k, v]) => [k, v[0]]), "Любой статус")}
        {sel("moderation", Object.entries(MODERATION).map(([k, v]) => [k, v[0]]), "Любая проверка")}
        {sel("type", Object.entries(LISTING_TYPES), "Любой тип")}
        {sel("resort", resorts.map(r => [r.slug, r.name]), "Все курорты")}
        {sel("sort", [["new", "Сначала новые"], ["upd", "Недавно изменённые"], ["views", "Больше просмотров"], ["price", "Дешевле"]], "Сортировка")}
        <label className="check small"><input type="checkbox" name="verified" value="1" defaultChecked={sp.verified === "1"} /> проверенные</label>
        <label className="check small"><input type="checkbox" name="nophoto" value="1" defaultChecked={sp.nophoto === "1"} /> без фото</label>
        <button className="btn ghost sm">Найти</button>
        <a className="btn ghost sm" href={`/admin/export/listings?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`}>Скачать CSV</a>
      </form>
      <div className="small muted">Найдено: {total}</div>
      <form action={bulkListings} className="stack">
        <div className="tablewrap"><table className="t"><thead><tr><th></th><th>№</th><th>Объект</th><th>Хозяин</th><th>Статус</th><th>Цена</th><th>Фото</th><th>Просм.</th><th>Заявки</th><th>Создан</th></tr></thead><tbody>
          {list.map(l => <tr key={l.id}>
            <td><input type="checkbox" name="ids" value={l.id} /></td>
            <td>{l.number}</td>
            <td><Link href={`/admin/listings/${l.id}`}>{l.title}</Link><div className="small muted">{LISTING_TYPES[l.type]} · {l.resort.name}{l.verified ? " · проверен" : ""}{l._count.complaints ? ` · жалоб ${l._count.complaints}` : ""}</div></td>
            <td className="small"><Link href={`/admin/users/${l.ownerId}`}>{l.owner.email ?? l.owner.name}</Link></td>
            <td><div className="stack" style={{ gap: 4 }}><span className={`tag ${LISTING_STATUS[l.status][1]}`}>{LISTING_STATUS[l.status][0]}</span><span className={`tag ${MODERATION[l.moderation][1]}`}>{MODERATION[l.moderation][0]}</span></div></td>
            <td className="num">{l.priceFrom ? rub(l.priceFrom) : "—"}</td><td className="num">{l._count.photos}</td><td className="num">{l.views}</td><td className="num">{l._count.bookings}</td>
            <td className="small muted">{fmtDate(l.createdAt)}</td>
          </tr>)}
        </tbody></table></div>
        <div className="toolbar"><span className="small muted">С отмеченными:</span>
          <select className="input" name="op"><option value="approve">Одобрить</option><option value="publish">Опубликовать</option><option value="hide">Скрыть</option><option value="block">Заблокировать</option><option value="verify">Отметить «Проверен»</option><option value="unverify">Снять «Проверен»</option></select>
          <button className="btn ghost sm">Применить</button></div>
      </form>
      <Pager page={page} pages={Math.ceil(total / TAKE)} sp={sp} path="/admin/listings" />
    </>
  );
}
