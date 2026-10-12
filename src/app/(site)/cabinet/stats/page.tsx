import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isoDate, fmtDate } from "@/lib/format";

export default async function Stats({ searchParams }: { searchParams: Promise<{ listing?: string; days?: string }> }) {
  const u = await requireUser("/cabinet/stats");
  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const listings = await db.listing.findMany({ where: { ownerId: u.id }, select: { id: true, title: true } });
  const ids = sp.listing && listings.some(l => l.id === sp.listing) ? [sp.listing] : listings.map(l => l.id);
  const from = new Date(Date.now() - (days - 1) * 86400000); from.setUTCHours(0, 0, 0, 0);
  const rows = await db.listingStatDaily.groupBy({ by: ["date"], where: { listingId: { in: ids }, date: { gte: from } }, _sum: { views: true, phoneViews: true, requests: true } });
  const map = new Map(rows.map(r => [isoDate(r.date), r._sum]));
  const series = Array.from({ length: days }, (_, i) => { const d = new Date(from.getTime() + i * 86400000); const r = map.get(isoDate(d)); return { d, v: r?.views ?? 0, p: r?.phoneViews ?? 0, q: r?.requests ?? 0 }; });
  const sum = (k: "v" | "p" | "q") => series.reduce((a, x) => a + x[k], 0);
  const max = Math.max(1, ...series.map(x => x.v));
  const per = await db.listingStatDaily.groupBy({ by: ["listingId"], where: { listingId: { in: listings.map(l => l.id) }, date: { gte: from } }, _sum: { views: true, phoneViews: true, requests: true } });
  const conv = sum("v") ? ((sum("p") + sum("q")) / sum("v") * 100).toFixed(1) : "0";
  return (
    <>
      <h1 className="h1">Статистика</h1>
      <form className="toolbar">
        <select className="input" name="listing" defaultValue={sp.listing ?? ""}><option value="">Все объекты</option>{listings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
        <select className="input" name="days" defaultValue={String(days)}><option value="7">7 дней</option><option value="30">30 дней</option><option value="90">90 дней</option></select>
        <button className="btn ghost sm">Показать</button>
      </form>
      <div className="stats">
        <div className="stat"><b>{sum("v")}</b><span>просмотров</span></div>
        <div className="stat"><b>{sum("p")}</b><span>показов телефона</span></div>
        <div className="stat"><b>{sum("q")}</b><span>заявок</span></div>
        <div className="stat"><b>{conv}%</b><span>из просмотра в звонок или заявку</span></div>
      </div>
      <div className="card-box stack"><b>Просмотры по дням</b>
        <div className="bar">{series.map(x => <i key={x.d.toISOString()} style={{ height: `${(x.v / max) * 100}%` }} title={`${fmtDate(x.d)}: ${x.v} просм., ${x.p} тел., ${x.q} заявок`} />)}</div>
        <div className="row between small muted"><span>{fmtDate(series[0].d)}</span><span>{fmtDate(series[series.length - 1].d)}</span></div>
      </div>
      {listings.length > 1 && <div className="tablewrap"><table className="t"><thead><tr><th>Объект</th><th>Просмотры</th><th>Телефон</th><th>Заявки</th></tr></thead><tbody>
        {listings.map(l => { const r = per.find(p => p.listingId === l.id)?._sum; return <tr key={l.id}><td>{l.title}</td><td className="num">{r?.views ?? 0}</td><td className="num">{r?.phoneViews ?? 0}</td><td className="num">{r?.requests ?? 0}</td></tr>; })}
      </tbody></table></div>}
    </>
  );
}
