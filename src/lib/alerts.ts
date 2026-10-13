import "server-only";
import { db } from "./db";
import { parseFilters, scopeWhere, searchListings } from "./queries";
import { sendTemplate } from "./mail";
import { rub } from "./format";

// Адрес поиска (/kurort/anapa/s-basseynom?sea=500) → выдача и фильтры
export async function alertQuery(path: string) {
  const u = new URL(path, "http://x");
  const m = u.pathname.match(/^\/kurort\/([^/]+)(?:\/([^/]+))?/);
  const scope = m ? { resort: m[1], filter: m[2] } : {};
  const base = await scopeWhere(scope);
  const sp: Record<string, string | string[]> = {};
  for (const k of new Set(u.searchParams.keys())) { const all = u.searchParams.getAll(k); sp[k] = all.length > 1 ? all : all[0]; }
  return { base, f: parseFilters(sp), url: u.pathname + u.search };
}

// Раз в день: письма о новых объявлениях по сохранённым поискам
export async function sendAlerts() {
  const day = new Date(Date.now() - 23 * 3600000);
  const list = await db.searchAlert.findMany({ where: { isActive: true, lastSentAt: { lt: day } }, take: 500 });
  const app = process.env.APP_URL || "";
  let sent = 0;
  for (const a of list) {
    const q = await alertQuery(a.query);
    if (!q.base) { await db.searchAlert.update({ where: { id: a.id }, data: { isActive: false } }); continue; }
    const { items } = await searchListings({ AND: [q.base, { publishedAt: { gt: a.lastSentAt } }] }, { ...q.f, sort: "new", page: 1 });
    await db.searchAlert.update({ where: { id: a.id }, data: { lastSentAt: new Date() } });
    if (!items.length) continue;
    const lines = items.slice(0, 10).map(l => `${l.title}, ${l.resort.name}${l.priceFrom ? `, от ${rub(l.priceFrom)}` : ""}\n${app}/obj/${l.number}`).join("\n\n");
    await sendTemplate(a.email, "search_alert", { title: a.title, items: lines, link: app + q.url, unsubscribe: `${app}/alerts/off/${a.token}` });
    sent++;
  }
  return sent;
}

// Типичное время ответа хозяина: медиана за полгода, если ответов хотя бы 3
export async function updateReplyMinutes() {
  const rows = await db.booking.findMany({
    where: { respondedAt: { not: null }, createdAt: { gt: new Date(Date.now() - 180 * 86400000) } },
    select: { createdAt: true, respondedAt: true, listing: { select: { ownerId: true } } },
  });
  const by = new Map<string, number[]>();
  for (const r of rows) {
    const m = Math.max(1, Math.round((r.respondedAt!.getTime() - r.createdAt.getTime()) / 60000));
    by.set(r.listing.ownerId, [...(by.get(r.listing.ownerId) ?? []), m]);
  }
  await db.user.updateMany({ where: { replyMinutes: { not: null }, id: { notIn: [...by.keys()] } }, data: { replyMinutes: null } });
  for (const [id, ms] of by) {
    if (ms.length < 3) { await db.user.update({ where: { id }, data: { replyMinutes: null } }); continue; }
    ms.sort((a, b) => a - b);
    await db.user.update({ where: { id }, data: { replyMinutes: ms[Math.floor(ms.length / 2)] } });
  }
}

export const replyLabel = (m?: number | null) =>
  m == null ? null : m <= 60 ? "Отвечает в течение часа" : m <= 360 ? "Отвечает за несколько часов" : m <= 1440 ? "Отвечает в течение дня" : null;
