import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/Forms";
import { saveProfile, changePassword } from "./actions";

export const metadata = { title: "Профиль" };

export default async function Account() {
  const u = await requireUser("/account");
  const accounts = await db.account.findMany({ where: { userId: u.id } });
  return (
    <main className="wrap" style={{ paddingBlock: 24, display: "grid", gap: 24, maxWidth: 640 }}>
      <h1 className="h1">Профиль</h1>
      <ActionForm action={saveProfile}>
        <div className="field"><label htmlFor="a-n">Имя</label><input className="input" id="a-n" name="name" defaultValue={u.name} /></div>
        <div className="field"><label>Почта</label><input className="input" value={u.email ?? "не указана"} disabled /></div>
        <div className="field"><label htmlFor="a-p">Телефон</label><input className="input" id="a-p" name="phone" defaultValue={u.phone ?? ""} /></div>
      </ActionForm>
      <section className="stack"><h2 className="h2">Пароль</h2>
        <ActionForm action={changePassword} submit="Сменить пароль">
          {u.passwordHash && <div className="field"><label htmlFor="c-c">Текущий пароль</label><input className="input" id="c-c" name="current" type="password" /></div>}
          <div className="field"><label htmlFor="c-n">Новый пароль</label><input className="input" id="c-n" name="next" type="password" minLength={8} /></div>
        </ActionForm></section>
      <p className="small muted">Входы через соцсети: {accounts.length ? accounts.map(a => a.provider === "vk" ? "ВКонтакте" : "Яндекс ID").join(", ") : "не подключены"}</p>
      <form action="/logout" method="post"><button className="btn ghost">Выйти</button></form>
    </main>
  );
}
