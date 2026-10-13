import { requireStaff } from "@/lib/auth";
import { demandMap } from "@/lib/demand";
import { Heatmap } from "@/components/Heatmap";
import { db } from "@/lib/db";

export const metadata = { title: "Спрос по курортам" };

export default async function Demand({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireStaff();
  const days = [30, 90, 365].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 90;
  const [d, total, noResort] = await Promise.all([
    demandMap(days),
    db.searchLog.count({ where: { createdAt: { gt: new Date(Date.now() - days * 86400000) } } }),
    db.searchLog.count({ where: { resortId: null, createdAt: { gt: new Date(Date.now() - days * 86400000) } } }),
  ]);
  return (
    <>
      <h1 className="h1">Спрос по курортам</h1>
      <form className="toolbar">
        <select className="input" name="days" defaultValue={String(days)}><option value="30">30 дней</option><option value="90">90 дней</option><option value="365">Год</option></select>
        <button className="btn ghost sm">Показать</button>
      </form>
      <p className="small muted">Поисков за период: {total}, из них без курорта: {noResort}. Месяц — по дате заезда, которую выбрал посетитель.</p>
      <div className="card-box"><Heatmap {...d} limit={100} /></div>
    </>
  );
}
