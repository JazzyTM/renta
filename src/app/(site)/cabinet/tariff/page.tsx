import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ownerPlan } from "@/lib/plan";
import { rub, fmtDate, fmtDateTime } from "@/lib/format";
import { PROMO_TYPES } from "@/lib/labels";
import { ActionForm } from "@/components/Forms";
import { buyTariff } from "../actions";

const ORDER_ST: Record<string, [string, string]> = { PENDING: ["Ждёт оплаты", "warn"], PAID: ["Оплачен", "ok"], CANCELLED: ["Отменён", "plain"], FAILED: ["Ошибка", "bad"] };

export default async function Tariff() {
  const u = await requireUser("/cabinet/tariff");
  const [plan, tariffs, orders, listings] = await Promise.all([
    ownerPlan(u.id),
    db.tariff.findMany({ where: { isActive: true }, orderBy: { sort: "asc" } }),
    db.order.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.listing.findMany({ where: { ownerId: u.id }, select: { id: true, title: true } }),
  ]);
  const title = (id: string | null) => listings.find(l => l.id === id)?.title ?? "";
  return (
    <>
      <h1 className="h1">Тариф и продвижение</h1>
      <div className="card-box stack">
        <div className="row between"><b>Сейчас: {plan.name}</b>{plan.sub && <span className="muted">до {fmtDate(plan.sub.endsAt)}</span>}</div>
        {plan.free && plan.freeUntil && <p>До {fmtDate(plan.freeUntil)} размещение бесплатное: до {plan.maxListings} объявлений, тариф покупать не нужно.</p>}
        <p className="small muted">Объявлений: до {plan.maxListings}. Фото в объявлении: до {plan.maxPhotos}.</p>
      </div>
      <div className="grid3">{tariffs.map(t => (
        <div key={t.id} className="card-box stack">
          <div className="row between"><b>{t.name}</b><span className="num">{t.price ? rub(t.price) : "бесплатно"}</span></div>
          <p className="small muted">{t.description}</p>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            <li>до {t.maxListings} объявлений</li><li>до {t.maxPhotos} фото</li><li>срок {t.periodDays} дн.</li>
            {t.priorityBoost > 0 && <li>выше в поиске</li>}
          </ul>
          <ActionForm action={buyTariff.bind(null, t.id)} submit={t.price ? "Купить" : "Подключить"} className="stack">
            {t.price > 0 && <input className="input" name="code" placeholder="Промокод" />}
          </ActionForm>
        </div>))}</div>
      <p className="small muted">Поднять, выделить или закрепить объявление можно на странице объявления.</p>
      {orders.length > 0 && <section className="stack"><h2 className="h2">Заказы</h2>
        <div className="tablewrap"><table className="t"><thead><tr><th>№</th><th>Что</th><th>Сумма</th><th>Статус</th><th>Дата</th></tr></thead><tbody>
          {orders.map(o => <tr key={o.id}><td>{o.number}</td>
            <td>{o.kind === "tariff" ? `Тариф «${tariffs.find(t => t.id === o.tariffId)?.name ?? ""}»` : `${PROMO_TYPES[o.promoType!]}: ${title(o.listingId)}`}</td>
            <td className="num">{rub(o.amount)}</td><td><span className={`tag ${ORDER_ST[o.status][1]}`}>{ORDER_ST[o.status][0]}</span></td><td className="small muted">{fmtDateTime(o.createdAt)}</td></tr>)}
        </tbody></table></div></section>}
    </>
  );
}
