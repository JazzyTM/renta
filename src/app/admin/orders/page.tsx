import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, rub } from "@/lib/format";
import { PROMO_TYPES } from "@/lib/labels";
import { ConfirmButton } from "@/components/Forms";
import { orderPaid, orderCancel } from "../actions";

export const metadata = { title: "Заказы" };
const ST: Record<string, [string, string]> = { PENDING: ["Ждёт оплаты", "warn"], PAID: ["Оплачен", "ok"], CANCELLED: ["Отменён", "plain"], FAILED: ["Ошибка", "bad"] };

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const status = (await searchParams).status ?? "all";
  const [list, tariffs, sum] = await Promise.all([
    db.order.findMany({ where: status === "all" ? {} : { status: status as any }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.tariff.findMany(), db.order.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);
  const listings = await db.listing.findMany({ where: { id: { in: list.map(o => o.listingId!).filter(Boolean) } }, select: { id: true, title: true } });
  return (
    <>
      <h1 className="h1">Заказы</h1>
      <p className="muted">Оплачено за всё время: {rub(sum._sum.amount ?? 0)}. Пока онлайн-оплата не подключена, отмечайте заказ оплаченным вручную: услуга включится сразу.</p>
      <div className="row">{[["all", "Все"], ...Object.entries(ST).map(([k, v]) => [k, v[0]])].map(([k, t]) => <Link key={k} className={`chip${status === k ? " on" : ""}`} href={`/admin/orders?status=${k}`}>{t}</Link>)}</div>
      <div className="tablewrap"><table className="t"><thead><tr><th>№</th><th>Кто</th><th>Что</th><th>Сумма</th><th>Статус</th><th>Создан</th><th></th></tr></thead><tbody>
        {list.map(o => <tr key={o.id}>
          <td>{o.number}</td><td><Link href={`/admin/users/${o.userId}`}>{o.user.email ?? o.user.name}</Link></td>
          <td>{o.kind === "tariff" ? `Тариф «${tariffs.find(t => t.id === o.tariffId)?.name}»` : `${PROMO_TYPES[o.promoType!]}: ${listings.find(l => l.id === o.listingId)?.title ?? ""}`}{o.promoCode ? <div className="small muted">промокод {o.promoCode}</div> : null}</td>
          <td className="num">{rub(o.amount)}</td><td><span className={`tag ${ST[o.status][1]}`}>{ST[o.status][0]}</span></td>
          <td className="small muted">{fmtDateTime(o.createdAt)}</td>
          <td>{o.status === "PENDING" && <div className="row">
            <form action={orderPaid.bind(null, o.id)}><ConfirmButton className="btn sm okb" message="Отметить оплаченным и включить услугу?">Оплачен</ConfirmButton></form>
            <form action={orderCancel.bind(null, o.id)}><button className="btn ghost sm">Отменить</button></form></div>}</td>
        </tr>)}
      </tbody></table></div>
    </>
  );
}
