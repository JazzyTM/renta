import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { ROLES } from "@/lib/labels";
import { Pager } from "@/components/admin/Pager";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Пользователи" };
const TAKE = 50;

export default async function Users({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requireStaff();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const and: Prisma.UserWhereInput[] = [];
  if (sp.q) and.push({ OR: [{ email: { contains: sp.q, mode: "insensitive" } }, { name: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }] });
  if (sp.role) and.push({ role: sp.role as any });
  if (sp.status) and.push({ status: sp.status as any });
  if (sp.owners === "1") and.push({ listings: { some: {} } });
  const where = { AND: and };
  const [list, total] = await Promise.all([
    db.user.findMany({ where, include: { accounts: true, _count: { select: { listings: true, bookings: true } } }, orderBy: { createdAt: "desc" }, take: TAKE, skip: (page - 1) * TAKE }),
    db.user.count({ where }),
  ]);
  return (
    <>
      <div className="row between"><h1 className="h1">Пользователи</h1>{u.role === "ADMIN" && <Link className="btn" href="/admin/users/new">Добавить</Link>}</div>
      <form className="toolbar">
        <input className="input" name="q" defaultValue={sp.q} placeholder="Почта, имя, телефон" />
        <select className="input" name="role" defaultValue={sp.role ?? ""}><option value="">Все роли</option>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input" name="status" defaultValue={sp.status ?? ""}><option value="">Любой статус</option><option value="ACTIVE">Активные</option><option value="BLOCKED">Заблокированные</option></select>
        <label className="check small"><input type="checkbox" name="owners" value="1" defaultChecked={sp.owners === "1"} /> с объявлениями</label>
        <button className="btn ghost sm">Найти</button>
        <a className="btn ghost sm" href={`/admin/export/users?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`}>Скачать CSV</a>
      </form>
      <div className="small muted">Найдено: {total}</div>
      <div className="tablewrap"><table className="t"><thead><tr><th>Пользователь</th><th>Роль</th><th>Вход через</th><th>Объявл.</th><th>Заявки</th><th>Регистрация</th><th>Был</th></tr></thead><tbody>
        {list.map(x => <tr key={x.id}>
          <td><Link href={`/admin/users/${x.id}`}>{x.email ?? "без почты"}</Link><div className="small muted">{x.name}{x.status === "BLOCKED" ? " · заблокирован" : ""}{x.email && !x.emailVerified ? " · почта не подтверждена" : ""}</div></td>
          <td>{ROLES[x.role]}</td>
          <td className="small">{[x.passwordHash ? "пароль" : null, ...x.accounts.map(a => a.provider === "vk" ? "VK" : "Яндекс")].filter(Boolean).join(", ")}</td>
          <td className="num">{x._count.listings}</td><td className="num">{x._count.bookings}</td>
          <td className="small muted">{fmtDate(x.createdAt)}</td><td className="small muted">{x.lastLoginAt ? fmtDateTime(x.lastLoginAt) : "—"}</td>
        </tr>)}
      </tbody></table></div>
      <Pager page={page} pages={Math.ceil(total / TAKE)} sp={sp} path="/admin/users" />
    </>
  );
}
