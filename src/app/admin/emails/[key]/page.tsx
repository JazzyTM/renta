import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { EMAIL_DEFAULTS } from "@/lib/mail";
import { ActionForm } from "@/components/Forms";
import { templateSave, templateReset } from "../../actions";
import { TPL_NAMES } from "@/lib/labels";

export default async function Template({ params }: { params: Promise<{ key: string }> }) {
  await requireAdmin();
  const { key } = await params;
  const def = EMAIL_DEFAULTS[key];
  if (!def) notFound();
  const row = await db.emailTemplate.findUnique({ where: { key } });
  const t = row ?? def;
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div className="small"><Link href="/admin/emails">← Шаблоны писем</Link></div>
      <h1 className="h1">{TPL_NAMES[key] ?? key}</h1>
      <p className="small muted">Подстановки: {def.vars} {"{site}"}</p>
      <ActionForm action={templateSave.bind(null, key)}>
        <div className="field"><label>Тема</label><input className="input" name="subject" defaultValue={t.subject} /></div>
        <div className="field"><label>Текст</label><textarea className="input" name="body" rows={12} defaultValue={t.body} /></div>
      </ActionForm>
      {row && <form action={templateReset.bind(null, key)}><button className="btn ghost sm">Вернуть стандартный текст</button></form>}
    </div>
  );
}
