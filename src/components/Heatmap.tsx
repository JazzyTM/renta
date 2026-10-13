import { MONTHS_SHORT } from "@/lib/demand";

// Таблица спроса: чем насыщеннее цвет, тем чаще ищут заезд в этом месяце
export function Heatmap({ list, max, limit = 30 }: { list: { name: string; months: number[]; any: number; total: number }[]; max: number; limit?: number }) {
  if (!list.length) return <p className="muted">Пока нет данных. Поиски начнут считаться, когда посетители будут выбирать даты.</p>;
  return (
    <div className="heat-wrap"><table className="heat">
      <thead><tr><th>Курорт</th>{MONTHS_SHORT.map(m => <th key={m}>{m}</th>)}<th>без дат</th><th>всего</th></tr></thead>
      <tbody>{list.slice(0, limit).map(r => <tr key={r.name}><th>{r.name}</th>
        {r.months.map((v, i) => <td key={i} style={v ? { background: `rgba(255,87,34,${(0.08 + 0.85 * v / max).toFixed(2)})`, color: v / max > 0.55 ? "#fff" : undefined } : undefined}>{v || ""}</td>)}
        <td className="muted">{r.any || ""}</td><td><b>{r.total}</b></td></tr>)}</tbody>
    </table></div>
  );
}
