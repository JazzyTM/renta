import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { ownerPlan } from "@/lib/plan";
import { fmtDate, fmtDateTime, fmtRange } from "@/lib/format";
import { ROLES, LISTING_STATUS, BOOKING_STATUS } from "@/lib/labels";
import { ActionForm, ConfirmButton } from "@/components/Forms";
import { userAdmin, grantSubscription, endSubscription, revokeSessions, sendReset, impersonate, setPassword } from "../../actions";

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, include: {
    accounts: true, sessions: { orderBy: { createdAt: "desc" }, take: 20 }, listings: { orderBy: { createdAt: "desc" } },
    subscriptions: { include: { tariff: true }, orderBy: { endsAt: "desc" } }, payout: true,
    bookings: { include: { listing: true }, orderBy: { createdAt: "desc" }, take: 20 },
  } });
  if (!u) notFound();
  const [tariffs, plan, log] = await Promise.all([
    db.tariff.findMany({ orderBy: { sort: "asc" } }), ownerPlan(id),
    db.auditLog.findMany({ where: { OR: [{ userId: id }, { entity: "User", entityId: id }] }, orderBy: { createdAt: "desc" }, take: 30, include: { user: true } }),
  ]);
  const admin = me.role === "ADMIN";
  return (
    <>
      <div className="small"><Link href="/admin/users">← Пользователи</Link></div>
      <div className="row between"><h1 className="h1">{u.name || u.email || "Пользователь"}</h1>
        <div className="row">
          {admin && u.id !== me.id && <form action={impersonate.bind(null, id)}><ConfirmButton message="Войти под этим пользователем? Вы выйдете из своего аккаунта.">Войти как он</ConfirmButton></form>}
          {u.email && <form action={sendReset.bind(null, id)}><button className="btn ghost sm">Отправить ссылку на смену пароля</button></form>}
          <form action={revokeSessions.bind(null, id)}><button className="btn ghost sm">Завершить все сеансы</button></form>
        </div></div>
      <div className="grid2">
        <div className="card-box stack"><b>Профиль</b>
          <ActionForm action={userAdmin.bind(null, id)}>
            <div className="grid2">
              <div className="field"><label>Имя</label><input className="input" name="name" defaultValue={u.name} /></div>
              <div className="field"><label>Телефон</label><input className="input" name="phone" defaultValue={u.phone ?? ""} /></div>
            </div>
            <div className="field"><label>Почта</label><input className="input" name="email" defaultValue={u.email ?? ""} /></div>
            {!u.emailVerified && <label className="check"><input type="checkbox" name="emailVerified" /> Подтвердить почту вручную</label>}
            <div className="grid2">
              <div className="field"><label>Роль</label><select className="input" name="role" defaultValue={u.role} disabled={!admin}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>{!admin && <input type="hidden" name="role" value={u.role} />}</div>
              <div className="field"><label>Статус</label><select className="input" name="status" defaultValue={u.status}><option value="ACTIVE">Активен</option><option value="BLOCKED">Заблокирован</option></select></div>
            </div>
            <div className="field"><label>Причина блокировки</label><input className="input" name="blockReason" defaultValue={u.blockReason ?? ""} /></div>
            <div className="field"><label>Заметка сотрудников</label><textarea className="input" name="adminNote" rows={2} defaultValue={u.adminNote ?? ""} /></div>
          </ActionForm>
          {admin && <ActionForm action={setPassword.bind(null, id)} submit="Задать пароль" className="row"><input className="input" name="password" placeholder="Новый пароль" style={{ flex: 1 }} /></ActionForm>}
        </div>
        <div className="stack">
          <div className="card-box stack"><b>Сведения</b>
            <dl className="kv">
              <dt>Регистрация</dt><dd>{fmtDateTime(u.createdAt)}</dd>
              <dt>Последний вход</dt><dd>{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "—"}</dd>
              <dt>Почта</dt><dd>{u.emailVerified ? "подтверждена" : "не подтверждена"}</dd>
              <dt>Вход</dt><dd>{[u.passwordHash ? "пароль" : null, ...u.accounts.map(a => a.provider === "vk" ? "ВКонтакте" : "Яндекс ID")].filter(Boolean).join(", ") || "—"}</dd>
              <dt>Тариф</dt><dd>{plan.name}, до {plan.maxListings} объявлений</dd>
              <dt>Реквизиты</dt><dd>{u.payout ? `${u.payout.fullName}, ИНН ${u.payout.inn || "—"}` : "не указаны"}</dd>
            </dl></div>
          {admin && <div className="card-box stack"><b>Выдать тариф</b>
            <ActionForm action={grantSubscription.bind(null, id)} submit="Выдать бесплатно">
              <div className="grid2">
                <div className="field"><label>Тариф</label><select className="input" name="tariffId">{tariffs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                <div className="field"><label>Дней</label><input className="input" name="days" type="number" defaultValue={180} /></div>
              </div>
              <div className="field"><label>Комментарий</label><input className="input" name="note" placeholder="Например: первый сезон бесплатно" /></div>
            </ActionForm>
            {u.subscriptions.map(s => <div key={s.id} className="row between small"><span>{s.tariff.name}: {fmtDate(s.startsAt)} – {fmtDate(s.endsAt)}{s.note ? ` (${s.note})` : ""}</span>
              {s.endsAt > new Date() && <form action={endSubscription.bind(null, id, s.id)}><button className="btn ghost sm">Завершить</button></form>}</div>)}
          </div>}
        </div>
      </div>
      {u.listings.length > 0 && <div className="card-box stack"><b>Объявления</b>
        <div className="lines">{u.listings.map(l => <div className="l" key={l.id}><Link href={`/admin/listings/${l.id}`}>№{l.number} {l.title}</Link><span className={`tag ${LISTING_STATUS[l.status][1]}`}>{LISTING_STATUS[l.status][0]}</span></div>)}</div></div>}
      {u.bookings.length > 0 && <div className="card-box stack"><b>Заявки как гость</b>
        <div className="lines">{u.bookings.map(b => <div className="l" key={b.id}><Link href={`/admin/bookings/${b.number}`}>№{b.number} {b.listing.title}, {fmtRange(b.checkIn, b.checkOut)}</Link><span className={`tag ${BOOKING_STATUS[b.status][1]}`}>{BOOKING_STATUS[b.status][0]}</span></div>)}</div></div>}
      <div className="grid2">
        <div className="card-box stack"><b>Сеансы и входы</b>
          <div className="lines">{u.sessions.map(s => <div className="l" key={s.id}><span className="small">{s.ip ?? "IP неизвестен"} · {(s.userAgent ?? "").slice(0, 60)}</span><span className="small muted">{fmtDateTime(s.createdAt)}</span></div>)}</div></div>
        <div className="card-box stack"><b>Журнал</b>
          <div className="lines">{log.map(a => <div className="l" key={a.id}><span className="small">{a.user?.email ?? "система"}: {a.action} {a.entity}</span><span className="small muted">{fmtDateTime(a.createdAt)}</span></div>)}</div></div>
      </div>
    </>
  );
}
