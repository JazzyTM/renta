import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { Pager } from "@/components/admin/Pager";

export const metadata = { title: "Журнал действий" };
const TAKE = 100;
const LINK: Record<string, string> = { Listing: "/admin/listings/", User: "/admin/users/" };

export default async function Audit({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { ...(sp.entity ? { entity: sp.entity } : {}), ...(sp.user ? { user: { email: { contains: sp.user, mode: "insensitive" as const } } } : {}), ...(sp.action ? { action: { contains: sp.action } } : {}) };
  const [list, total, entities] = await Promise.all([
    db.auditLog.findMany({ where, include: { user: true }, orderBy: { createdAt: "desc" }, take: TAKE, skip: (page - 1) * TAKE }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true } }),
  ]);
  return (
    <>
      <h1 className="h1">Журнал действий</h1>
      <form className="toolbar">
        <select className="input" name="entity" defaultValue={sp.entity ?? ""}><option value="">Все объекты</option>{entities.map(e => <option key={e.entity}>{e.entity}</option>)}</select>
        <input className="input" name="user" defaultValue={sp.user} placeholder="Почта сотрудника" />
        <input className="input" name="action" defaultValue={sp.action} placeholder="Действие" />
        <button className="btn ghost sm">Найти</button>
      </form>
      <div className="tablewrap"><table className="t"><thead><tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Объект</th><th>Данные</th></tr></thead><tbody>
        {list.map(a => <tr key={a.id}><td className="small muted">{fmtDateTime(a.createdAt)}</td><td className="small">{a.user?.email ?? "система"}</td><td>{a.action}</td>
          <td className="small">{a.entityId && LINK[a.entity] ? <Link href={LINK[a.entity] + a.entityId}>{a.entity}</Link> : a.entity}</td>
          <td className="small muted" style={{ maxWidth: 360, overflowWrap: "anywhere" }}>{a.data ? JSON.stringify(a.data).slice(0, 200) : ""}</td></tr>)}
      </tbody></table></div>
      <Pager page={page} pages={Math.ceil(total / TAKE)} sp={sp} path="/admin/audit" />
    </>
  );
}
