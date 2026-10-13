import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { refCodeOf } from "@/lib/referral";
import { fmtDate } from "@/lib/format";
import { CopyField } from "@/components/CopyField";

export const metadata = { title: "Пригласить хозяина" };

export default async function Referral() {
  const u = await requireUser("/cabinet/referral");
  const s = await getSettings();
  if (!s.referralOn) return <><h1 className="h1">Пригласить хозяина</h1><p className="muted">Приглашения сейчас выключены.</p></>;
  const code = await refCodeOf(u.id);
  const [list, bonus] = await Promise.all([
    db.user.findMany({ where: { referredById: u.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, createdAt: true, _count: { select: { listings: { where: { publishedAt: { not: null } } } } } } }),
    db.subscription.findMany({ where: { userId: u.id, note: { startsWith: "ref:" } }, select: { note: true } }),
  ]);
  const paid = new Set(bonus.map(b => b.note!.slice(4)));
  return (
    <>
      <h1 className="h1">Пригласить хозяина</h1>
      <div className="card-box stack">
        <p>Отправьте ссылку знакомым, кто сдаёт жильё у моря. Когда приглашённый опубликует первое объявление, вам добавится <b>{s.referralDays} дн.</b> тарифа.</p>
        <CopyField value={`${process.env.APP_URL || ""}/r/${code}`} />
      </div>
      <div className="card-box stack"><b>Приглашённые</b>
        {list.length ? <div className="lines">{list.map(r => <div className="l" key={r.id}><span>{r.name || "Без имени"} <span className="small muted">с {fmtDate(r.createdAt)}</span></span>
          <span className={`tag ${paid.has(r.id) ? "ok" : ""}`}>{paid.has(r.id) ? `+${s.referralDays} дн.` : r._count.listings ? "объявление опубликовано" : "ещё нет объявлений"}</span></div>)}</div>
          : <p className="muted">Пока никого.</p>}
      </div>
    </>
  );
}
