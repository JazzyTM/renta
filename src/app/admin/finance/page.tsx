import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { rub } from "@/lib/format";
import { PROMO_TYPES } from "@/lib/labels";
import { Chart } from "@/components/Chart";

export const metadata = { title: "Деньги" };
const MON = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

// Отчёт по деньгам: оплаченные заказы за год по месяцам, по видам услуг, тарифам, промокодам и покупателям
export default async function Finance({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireAdmin();
  const now = new Date();
  const year = Number((await searchParams).year) || now.getUTCFullYear();
  const from = new Date(Date.UTC(year, 0, 1)), to = new Date(Date.UTC(year + 1, 0, 1));
  const [paid, pending, tariffs, first] = await Promise.all([
    db.order.findMany({ where: { status: "PAID", paidAt: { gte: from, lt: to } }, include: { user: { select: { id: true, email: true, name: true } } } }),
    db.order.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
    db.tariff.findMany({ select: { id: true, name: true } }),
    db.order.findFirst({ where: { status: "PAID" }, orderBy: { paidAt: "asc" }, select: { paidAt: true } }),
  ]);
  const total = paid.reduce((a, o) => a + o.amount, 0);
  const byMonth = Array.from({ length: 12 }, (_, m) => paid.filter(o => o.paidAt!.getUTCMonth() === m));
  const sumOf = (list: typeof paid) => list.reduce((a, o) => a + o.amount, 0);
  const group = (key: (o: (typeof paid)[number]) => string) => {
    const m = new Map<string, { n: number; sum: number }>();
    for (const o of paid) { const k = key(o); const v = m.get(k) ?? { n: 0, sum: 0 }; v.n++; v.sum += o.amount; m.set(k, v); }
    return [...m].sort((a, b) => b[1].sum - a[1].sum);
  };
  const byService = group(o => o.kind === "tariff" ? `Тариф «${tariffs.find(t => t.id === o.tariffId)?.name ?? "?"}»` : PROMO_TYPES[o.promoType!] ?? "Продвижение");
  const byPromo = group(o => o.promoCode ?? "").filter(([k]) => k);
  const byUser = group(o => o.user.email ?? o.user.name).slice(0, 10);
  const buyers = new Set(paid.map(o => o.userId)).size;
  const years: number[] = [];
  for (let y = now.getUTCFullYear(); y >= (first?.paidAt?.getUTCFullYear() ?? now.getUTCFullYear()); y--) years.push(y);
  const Table = ({ title, rows, empty }: { title: string; rows: [string, { n: number; sum: number }][]; empty: string }) => (
    <section className="card-box stack"><h2 className="h2">{title}</h2>
      {rows.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Название</th><th>Заказов</th><th>Сумма</th><th>Доля</th></tr></thead><tbody>
        {rows.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v.n}</td><td className="num">{rub(v.sum)}</td><td className="num">{total ? Math.round(v.sum / total * 100) : 0}%</td></tr>)}
      </tbody></table></div> : <p className="muted small">{empty}</p>}
    </section>
  );
  return (
    <>
      <div className="row between"><h1 className="h1">Деньги</h1>
        <div className="row">
          {years.map(y => <Link key={y} className={`chip ${y === year ? "on" : ""}`} href={`/admin/finance?year=${y}`}>{y}</Link>)}
          <a className="btn ghost sm" href={`/admin/export/orders?year=${year}`}>Скачать CSV</a>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><b>{rub(total)}</b><span>оплачено за {year} год</span></div>
        <div className="stat"><b>{paid.length}</b><span>оплаченных заказов</span></div>
        <div className="stat"><b>{paid.length ? rub(Math.round(total / paid.length)) : "—"}</b><span>средний чек</span></div>
        <div className="stat"><b>{buyers}</b><span>хозяев купили услуги</span></div>
        <Link className="stat" href="/admin/orders?status=PENDING"><b>{rub(pending._sum.amount ?? 0)}</b><span>ждут оплаты, заказов {pending._count}</span></Link>
      </div>
      <section className="card-box stack"><h2 className="h2">По месяцам</h2>
        <Chart series={["Сумма, ₽", "Заказы"]} data={byMonth.map((l, m) => ({ label: `${MON[m]} ${year}`, values: [sumOf(l), l.length] }))} />
      </section>
      <div className="grid2" style={{ alignItems: "start" }}>
        <Table title="По услугам" rows={byService} empty="Оплат за этот год нет" />
        <Table title="Промокоды" rows={byPromo} empty="Оплат с промокодами нет" />
      </div>
      <Table title="Кто платит больше всех" rows={byUser} empty="Оплат за этот год нет" />
    </>
  );
}
