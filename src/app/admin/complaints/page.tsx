import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { COMPLAINT_STATUS } from "@/lib/labels";
import { ActionForm } from "@/components/Forms";
import { complaintSet } from "../actions";

export const metadata = { title: "Жалобы" };

export default async function Complaints({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff();
  const status = (await searchParams).status ?? "OPEN";
  const list = await db.complaint.findMany({ where: status === "all" ? {} : { status: status as any }, include: { listing: true, author: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <h1 className="h1">Жалобы</h1>
      <div className="row">{[...Object.entries(COMPLAINT_STATUS).map(([k, v]) => [k, v[0]]), ["all", "Все"]].map(([k, t]) => <Link key={k} className={`chip${status === k ? " on" : ""}`} href={`/admin/complaints?status=${k}`}>{t}</Link>)}</div>
      {!list.length && <p className="muted">Пусто.</p>}
      {list.map(c => (
        <div key={c.id} className="card-box stack">
          <div className="row between"><b>{c.reason}</b><span className={`tag ${COMPLAINT_STATUS[c.status][1]}`}>{COMPLAINT_STATUS[c.status][0]}</span></div>
          <div className="small muted">{c.listing ? <Link href={`/admin/listings/${c.listingId}`}>№{c.listing.number} {c.listing.title}</Link> : "объявление удалено"} · от {c.author?.email ?? c.email ?? "аноним"} · {fmtDateTime(c.createdAt)}</div>
          {c.text && <p style={{ whiteSpace: "pre-wrap" }}>{c.text}</p>}
          <ActionForm action={complaintSet.bind(null, c.id)} className="row">
            <select className="input" name="status" defaultValue={c.status} style={{ width: "auto" }}>{Object.entries(COMPLAINT_STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
            <input className="input" name="resolution" defaultValue={c.resolution ?? ""} placeholder="Что сделано" style={{ flex: 1 }} />
          </ActionForm>
        </div>
      ))}
    </>
  );
}
