import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { LEGAL_FORMS } from "@/lib/labels";
import { ActionForm } from "@/components/Forms";
import { savePayout } from "../actions";

export default async function Payout() {
  const u = await requireUser("/cabinet/payout");
  const p = await db.payoutDetails.findUnique({ where: { userId: u.id } });
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <h1 className="h1">Реквизиты</h1>
      <p className="muted">Понадобятся, когда на сайте включится онлайн-предоплата: деньги гостя придут на этот счёт. Пока гости платят вам напрямую.</p>
      <ActionForm action={savePayout}>
        <div className="field"><label>Статус</label><select className="input" name="legalForm" defaultValue={p?.legalForm ?? "SELF_EMPLOYED"}>{Object.entries(LEGAL_FORMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label>ФИО или название</label><input className="input" name="fullName" defaultValue={p?.fullName ?? ""} /></div>
        <div className="grid2">
          <div className="field"><label>ИНН</label><input className="input" name="inn" inputMode="numeric" defaultValue={p?.inn ?? ""} /></div>
          <div className="field"><label>БИК банка</label><input className="input" name="bik" inputMode="numeric" defaultValue={p?.bik ?? ""} /></div>
        </div>
        <div className="field"><label>Расчётный счёт</label><input className="input" name="account" inputMode="numeric" defaultValue={p?.account ?? ""} /></div>
      </ActionForm>
    </div>
  );
}
