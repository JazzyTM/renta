import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { CRUD, delegate, fieldOptions } from "@/lib/crud";
import { fmtDate } from "@/lib/format";
import { Pager } from "@/components/admin/Pager";

const TAKE = 50;

export default async function CrudList({ params, searchParams }: { params: Promise<{ entity: string }>; searchParams: Promise<{ q?: string; page?: string }> }) {
  const { entity } = await params;
  const e = CRUD[entity];
  if (!e) notFound();
  if (e.adminOnly) await requireAdmin(); else await requireStaff();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.q && e.search ? { OR: e.search.map(k => ({ [k]: { contains: sp.q, mode: "insensitive" } })) } : {};
  const [rows, total] = await Promise.all([
    delegate(e.model).findMany({ where, orderBy: e.orderBy, take: TAKE, skip: (page - 1) * TAKE }),
    delegate(e.model).count({ where }),
  ]);
  const cols = e.columns.map(k => e.fields.find(f => f.key === k) ?? { key: k, label: k === "used" ? "Использован" : k, type: "text" as const });
  const opts: Record<string, Map<string, string>> = {};
  for (const f of cols) if (f.type === "select") opts[f.key] = new Map(await fieldOptions(f as any));
  const show = (f: (typeof cols)[number], v: any) =>
    f.type === "bool" ? (v ? "✓" : "—") : f.type === "date" ? (v ? fmtDate(v) : "—") : f.type === "select" ? opts[f.key].get(v) ?? v ?? "—" : String(v ?? "—");
  return (
    <>
      <div className="row between"><h1 className="h1">{e.title}</h1><Link className="btn" href={`/admin/c/${entity}/new`}>Добавить {e.one}</Link></div>
      {e.search && <form className="toolbar"><input className="input" name="q" defaultValue={sp.q} placeholder="Поиск" /><button className="btn ghost sm">Найти</button></form>}
      <div className="small muted">Всего: {total}</div>
      <div className="tablewrap"><table className="t"><thead><tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead><tbody>
        {rows.map((r: any) => <tr key={r.id}>{cols.map((c, i) => <td key={c.key}>{i === 0 ? <Link href={`/admin/c/${entity}/${r.id}`}>{show(c, r[c.key])}</Link> : show(c, r[c.key])}</td>)}</tr>)}
      </tbody></table></div>
      <Pager page={page} pages={Math.ceil(total / TAKE)} sp={{ q: sp.q }} path={`/admin/c/${entity}`} />
    </>
  );
}
