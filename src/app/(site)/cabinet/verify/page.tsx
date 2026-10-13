import { requireUser } from "@/lib/auth";
import { uploadIdDoc } from "../actions";
import { ActionForm } from "@/components/Forms";

export const metadata = { title: "Проверка личности" };

export default async function Verify() {
  const u = await requireUser("/cabinet/verify");
  return (
    <>
      <h1 className="h1">Проверка личности</h1>
      <div className="card-box stack">
        <p>После проверки в ваших объявлениях появится отметка «Личность подтверждена». Гости чаще выбирают такие объявления.</p>
        {u.idStatus === "APPROVED" ? <div className="notice ok">Личность подтверждена.</div>
          : u.idStatus === "PENDING" ? <div className="notice">Фото на проверке. Обычно проверяем в течение дня.</div>
          : <>
            {u.idStatus === "REJECTED" && <div className="notice bad">Не получилось подтвердить{u.idNote ? `: ${u.idNote}` : ""}. Попробуйте загрузить фото ещё раз.</div>}
            <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Сфотографируйте разворот паспорта с фото. Серию и номер можно закрыть пальцем или бумажкой.</li>
              <li>Имя и фото должны читаться, без бликов.</li>
              <li>Фото видит только модератор. Оно хранится в закрытой папке и удаляется сразу после проверки.</li>
            </ul>
            <ActionForm action={uploadIdDoc} submit="Отправить на проверку">
              <input className="input" type="file" name="doc" accept="image/*" required />
              <label className="check"><input type="checkbox" name="agree" required /> Согласен на обработку персональных данных для проверки</label>
            </ActionForm>
          </>}
      </div>
    </>
  );
}
