import { requireAdmin } from "@/lib/auth";
import { ROLES } from "@/lib/labels";
import { ActionForm } from "@/components/Forms";
import { createUser } from "../../actions";

export default async function NewUser() {
  await requireAdmin();
  return (
    <div className="stack" style={{ maxWidth: 480 }}>
      <h1 className="h1">Новый пользователь</h1>
      <ActionForm action={createUser} submit="Создать">
        <div className="field"><label>Почта</label><input className="input" name="email" type="email" required /></div>
        <div className="field"><label>Имя</label><input className="input" name="name" /></div>
        <div className="field"><label>Пароль</label><input className="input" name="password" type="text" minLength={8} required /></div>
        <div className="field"><label>Роль</label><select className="input" name="role" defaultValue="OWNER">{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      </ActionForm>
    </div>
  );
}
