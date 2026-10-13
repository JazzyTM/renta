import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AB_PLACES } from "@/lib/ab";

export const metadata = { title: "A/B-тесты" };

// Насколько уверенно вариант лучше контрольного (двусторонний z-тест долей)
function confidence(v1: number, g1: number, v0: number, g0: number) {
  if (v1 < 30 || v0 < 30) return null;
  const p1 = g1 / v1, p0 = g0 / v0, p = (g1 + g0) / (v1 + v0);
  const se = Math.sqrt(p * (1 - p) * (1 / v1 + 1 / v0));
  if (!se) return null;
  const z = Math.abs(p1 - p0) / se;
  const t = 1 / (1 + 0.2316419 * z), d = 0.3989423 * Math.exp(-z * z / 2);
  const tail = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return Math.round((1 - 2 * tail) * 100);
}

export default async function Experiments() {
  await requireAdmin();
  const [list, stats] = await Promise.all([
    db.experiment.findMany({ orderBy: { createdAt: "desc" } }),
    db.experimentEvent.groupBy({ by: ["key", "variant", "kind"], _count: true }),
  ]);
  const n = (key: string, v: number, kind: string) => stats.find(s => s.key === key && s.variant === v && s.kind === kind)?._count ?? 0;
  const GOALS: Record<string, string> = { request: "заявка", phone: "показ телефона", search: "поиск" };
  return (
    <>
      <div className="row between"><h1 className="h1">A/B-тесты</h1><Link className="btn sm" href="/admin/c/experiments/new">Новый тест</Link></div>
      <p className="small muted">Посетитель случайно получает один из вариантов текста и видит его всегда. Считаем, сколько раз вариант показали и сколько раз после этого была цель. Вывод делайте, когда уверенность выше 95%.</p>
      {!list.length && <div className="card-box muted">Тестов пока нет.</div>}
      {list.map(e => {
        const vs = e.variants.split("|").map(v => v.trim());
        const place = AB_PLACES.find(p => p.key === e.key);
        return (
          <div className="card-box stack" key={e.id}>
            <div className="row between"><b>{e.title} {!e.isActive && <span className="tag">остановлен</span>}</b><Link className="small" href={`/admin/c/experiments/${e.id}`}>Изменить</Link></div>
            <span className="small muted">{place?.title ?? e.key} · цель: {GOALS[e.goal] ?? e.goal}</span>
            <div className="tablewrap"><table className="t"><thead><tr><th>Вариант</th><th>Показы</th><th>Цели</th><th>Конверсия</th><th>Уверенность</th></tr></thead><tbody>
              {vs.map((v, i) => {
                const views = n(e.key, i, "view"), goals = n(e.key, i, "goal");
                const c = i ? confidence(views, goals, n(e.key, 0, "view"), n(e.key, 0, "goal")) : null;
                return <tr key={i}><td>{v}{i === 0 && <span className="small muted"> · контроль</span>}</td><td className="num">{views}</td><td className="num">{goals}</td>
                  <td className="num">{views ? (goals / views * 100).toFixed(1) + "%" : "—"}</td><td className="num">{i === 0 ? "" : c == null ? "мало данных" : c + "%"}</td></tr>;
              })}
            </tbody></table></div>
          </div>
        );
      })}
    </>
  );
}
