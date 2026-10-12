import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { AUD } from "@/lib/labels";

export const metadata = { title: "Рассылки" };

export default async function Campaigns() {
  await requireAdmin();
  const list = await db.campaign.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <div className="row between"><h1 className="h1">Рассылки</h1><Link className="btn" href="/admin/campaigns/new">Новая рассылка</Link></div>
      <p className="muted">Письма уходят пользователям с подтверждённой почтой.</p>
      <div className="tablewrap"><table className="t"><thead><tr><th>Тема</th><th>Кому</th><th>Статус</th><th>Отправлено</th></tr></thead><tbody>
        {list.map(c => <tr key={c.id}><td><Link href={`/admin/campaigns/${c.id}`}>{c.subject}</Link></td><td>{AUD[c.audience]}</td><td>{c.status === "SENT" ? <span className="tag ok">Отправлена</span> : <span className="tag">Черновик</span>}</td><td className="small muted">{c.sentAt ? `${fmtDateTime(c.sentAt)}, ${c.sentCount} писем` : "—"}</td></tr>)}
      </tbody></table></div>
    </>
  );
}
