import "server-only";
import { headers } from "next/headers";
import { db } from "./db";

// Записываем поиск: курорт и месяц заезда. Роботов не считаем.
export async function logSearch(resortSlug?: string, ci?: string, guests?: number) {
  const ua = (await headers()).get("user-agent") ?? "";
  if (!ua || /bot|crawl|spider|slurp|yandex(?!browser)|headless|lighthouse|curl|wget/i.test(ua)) return;
  const r = resortSlug ? await db.resort.findUnique({ where: { slug: resortSlug }, select: { id: true } }) : null;
  await db.searchLog.create({ data: { resortId: r?.id, month: ci ? Number(ci.slice(5, 7)) : null, guests } });
}

export const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

// Карта спроса за N дней: строки — курорты, столбцы — месяцы заезда
export async function demandMap(days = 90, resortIds?: string[]) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await db.searchLog.groupBy({
    by: ["resortId", "month"], _count: true,
    where: { createdAt: { gt: since }, resortId: resortIds ? { in: resortIds } : { not: null } },
  });
  const ids = [...new Set(rows.map(r => r.resortId!))];
  const resorts = await db.resort.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const name = new Map(resorts.map(r => [r.id, r.name]));
  const by = new Map<string, { name: string; months: number[]; any: number; total: number }>();
  for (const r of rows) {
    const x = by.get(r.resortId!) ?? { name: name.get(r.resortId!) ?? "?", months: Array(12).fill(0), any: 0, total: 0 };
    if (r.month) x.months[r.month - 1] += r._count; else x.any += r._count;
    x.total += r._count;
    by.set(r.resortId!, x);
  }
  const list = [...by.values()].sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...list.flatMap(x => x.months));
  return { list, max };
}
