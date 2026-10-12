import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ActionForm, ConfirmButton } from "@/components/Forms";
import { campaignSave, campaignSend, campaignTest, audienceWhere } from "../../actions";
import { AUD } from "@/lib/labels";

export default async function Campaign({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const c = id === "new" ? null : await db.campaign.findUnique({ where: { id } });
  if (id !== "new" && !c) notFound();
  const count = c ? await db.user.count({ where: await audienceWhere(c.audience) }) : 0;
  const sent = c?.status === "SENT";
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div className="small"><Link href="/admin/campaigns">← Рассылки</Link></div>
      <h1 className="h1">{c ? c.subject : "Новая рассылка"}</h1>
      {sent && <div className="notice ok">Отправлена: {c!.sentCount} писем</div>}
      <ActionForm action={campaignSave.bind(null, c?.id ?? null)}>
        <div className="field"><label>Кому</label><select className="input" name="audience" defaultValue={c?.audience ?? "owners"} disabled={sent}>{Object.entries(AUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label>Тема</label><input className="input" name="subject" defaultValue={c?.subject ?? ""} required /></div>
        <div className="field"><label>Текст</label><textarea className="input" name="body" rows={12} defaultValue={c?.body ?? "Здравствуйте, {name}!\n\n"} /><span className="hint">{"{name}"} заменится на имя получателя</span></div>
      </ActionForm>
      {c && !sent && <div className="row">
        <form action={campaignTest.bind(null, c.id)}><button className="btn ghost">Отправить тест себе</button></form>
        <form action={campaignSend.bind(null, c.id)}><ConfirmButton className="btn" message={`Отправить ${count} получателям? Отменить будет нельзя.`}>Отправить ({count})</ConfirmButton></form>
      </div>}
    </div>
  );
}
