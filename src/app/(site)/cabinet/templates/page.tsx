import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm, ConfirmButton } from "@/components/Forms";
import { saveTemplate, deleteTemplate } from "../actions";

export const metadata = { title: "Шаблоны ответов" };

export default async function Templates() {
  const u = await requireUser("/cabinet/templates");
  const list = await db.replyTemplate.findMany({ where: { ownerId: u.id }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] });
  return (
    <>
      <h1 className="h1">Шаблоны ответов</h1>
      <p className="muted">Готовые тексты для ответа на заявку: реквизиты для предоплаты, как добраться, правила заселения. В заявке нажмите на шаблон, и текст подставится в сообщение. Можно писать {"{гость}"} и {"{даты}"}, они заменятся на имя гостя и даты.</p>
      {list.map(t => <div className="card-box stack" key={t.id}>
        <ActionForm action={saveTemplate.bind(null, t.id)}>
          <div className="field"><label>Название</label><input className="input" name="title" defaultValue={t.title} required maxLength={60} /></div>
          <div className="field"><label>Текст</label><textarea className="input" name="text" rows={4} defaultValue={t.text} required /></div>
        </ActionForm>
        <form action={deleteTemplate.bind(null, t.id)}><ConfirmButton message="Удалить шаблон?" className="link">Удалить</ConfirmButton></form>
      </div>)}
      <div className="card-box stack"><b>Новый шаблон</b>
        <ActionForm action={saveTemplate.bind(null, null)} submit="Добавить">
          <div className="field"><label>Название</label><input className="input" name="title" required maxLength={60} placeholder="Например: Даты свободны" /></div>
          <div className="field"><label>Текст</label><textarea className="input" name="text" rows={4} required placeholder="{гость}, здравствуйте! На {даты} свободно. Предоплата — сутки, перевод на карту…" /></div>
        </ActionForm></div>
    </>
  );
}
