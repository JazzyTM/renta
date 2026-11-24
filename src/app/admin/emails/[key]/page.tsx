import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { EMAIL_DEFAULTS, previewTemplate } from "@/lib/mail";
import { ActionForm } from "@/components/Forms";
import { templateSave, templateReset, templateTest } from "../../actions";
import { TPL_NAMES } from "@/lib/labels";

export default async function Template({ params }: { params: Promise<{ key: string }> }) {
  await requireAdmin();
  const { key } = await params;
  const def = EMAIL_DEFAULTS[key];
  if (!def) notFound();
  const row = await db.emailTemplate.findUnique({ where: { key } });
  const t = row ?? def;
  const preview = await previewTemplate(key);
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
      <h2 className="h2" style={{ marginTop: 12 }}>Как выглядит письмо</h2>
      <p className="small muted">С примером подстановок. Строка «Подпись: ссылка» становится кнопкой, строки «Подпись: значение» — таблицей, «Комментарий:» и «Причина:» — выделенным блоком. После сохранения обновите страницу.</p>
      <iframe title="Превью письма" srcDoc={preview.html} style={{ width: "100%", height: 720, border: "1px solid var(--line)", borderRadius: 8, background: "#F0F2F4" }} />
      <ActionForm action={templateTest.bind(null, key)} submit="Прислать пример себе на почту" className="row"><span /></ActionForm>
    </div>
  );
}
