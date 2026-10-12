import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { readNotifications } from "../actions";

export default async function Notifications() {
  const u = await requireUser("/cabinet/notifications");
  const list = await db.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <div className="row between"><h1 className="h1">Уведомления</h1>
        {list.some(n => !n.readAt) && <form action={readNotifications}><button className="btn ghost sm">Отметить прочитанными</button></form>}</div>
      {!list.length && <p className="muted">Пусто.</p>}
      <div className="stack">{list.map(n => (
        <div key={n.id} className="card-box row between" style={{ padding: 12, fontWeight: n.readAt ? 400 : 700 }}>
          <span>{n.link ? <Link href={n.link}>{n.title}</Link> : n.title}{n.body ? <span className="muted"> {n.body}</span> : null}</span>
          <span className="small muted">{fmtDateTime(n.createdAt)}</span>
        </div>))}</div>
    </>
  );
}
