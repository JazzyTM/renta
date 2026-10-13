import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { ActionForm } from "@/components/Forms";
import { idDecision } from "../actions";

export const metadata = { title: "Проверка личности" };

export default async function IdCheck() {
  await requireStaff();
  const [list, done] = await Promise.all([
    db.user.findMany({ where: { idStatus: "PENDING" }, orderBy: { updatedAt: "asc" }, select: { id: true, name: true, email: true, updatedAt: true, idDocPath: true } }),
    db.user.count({ where: { idStatus: "APPROVED" } }),
  ]);
  return (
    <>
      <h1 className="h1">Проверка личности</h1>
      <p className="small muted">Сравните имя в паспорте с именем в профиле и объявлениях. После решения фото удаляется с сервера. Подтверждено всего: {done}.</p>
      {!list.length && <div className="card-box muted">Новых заявок нет.</div>}
      {list.map(u => <div className="card-box stack" key={u.id}>
        <div className="row between"><Link href={`/admin/users/${u.id}`}><b>{u.name || "Без имени"}</b> {u.email}</Link><span className="small muted">{fmtDateTime(u.updatedAt)}</span></div>
        {u.idDocPath ? <a href={`/api/idphoto/${u.id}`} target="_blank" rel="noopener"><img src={`/api/idphoto/${u.id}`} alt="Документ" style={{ maxWidth: "100%", maxHeight: 480, borderRadius: 8 }} /></a> : <span className="muted">Фото нет</span>}
        <div className="grid2">
          <ActionForm action={idDecision.bind(null, u.id, true)} submit="Подтвердить"><span className="small muted">Имя совпадает, фото чёткое</span></ActionForm>
          <ActionForm action={idDecision.bind(null, u.id, false)} submit="Отклонить"><input className="input" name="note" placeholder="Причина: например, не читается имя" /></ActionForm>
        </div>
      </div>)}
    </>
  );
}
