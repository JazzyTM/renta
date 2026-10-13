import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { ActionForm } from "@/components/Forms";
import { testMail } from "../actions";

export const metadata = { title: "Журнал писем" };

export default async function EmailLog({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const q = (await searchParams).q;
  const list = await db.emailLog.findMany({ where: q ? { to: { contains: q, mode: "insensitive" } } : {}, orderBy: { createdAt: "desc" }, take: 200 });
  const ST: Record<string, [string, string]> = { sent: ["отправлено", "ok"], failed: ["ошибка", "bad"], logged: ["SMTP не настроен", "warn"] };
  return (
    <>
      <h1 className="h1">Журнал писем</h1>
      <div className="card-box"><ActionForm action={testMail} submit="Отправить тестовое письмо" className="fline"><input className="input" name="to" type="email" placeholder="Куда" required /></ActionForm></div>
      <form className="toolbar"><input className="input" name="q" defaultValue={q} placeholder="Получатель" /><button className="btn ghost sm">Найти</button></form>
      <div className="tablewrap"><table className="t"><thead><tr><th>Кому</th><th>Тема</th><th>Статус</th><th>Когда</th></tr></thead><tbody>
        {list.map(e => <tr key={e.id}><td>{e.to}</td><td>{e.subject}</td><td><span className={`tag ${ST[e.status]?.[1]}`}>{ST[e.status]?.[0] ?? e.status}</span>{e.error && <div className="small muted">{e.error}</div>}</td><td className="small muted">{fmtDateTime(e.createdAt)}</td></tr>)}
      </tbody></table></div>
    </>
  );
}
