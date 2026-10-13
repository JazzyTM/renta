import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { expirePromotions } from "@/lib/payments";
import { sendAlerts, updateReplyMinutes } from "@/lib/alerts";
import { syncIcal } from "@/lib/ical";

// Вызывается таймером systemd раз в час: curl -H "x-cron-key: $CRON_SECRET" localhost:3000/api/cron
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("x-cron-key") !== process.env.CRON_SECRET) return new Response("forbidden", { status: 403 });
  const s = await getSettings();
  await expirePromotions();
  // Заявки без ответа хозяина дольше N×3 часов помечаем «Нет ответа», гость видит это на странице заявки
  const limit = new Date(Date.now() - Number(s.responseHours) * 3 * 3600000);
  const stale = await db.booking.updateMany({ where: { status: "NEW", createdAt: { lt: limit } }, data: { status: "NO_RESPONSE" } });
  // Прошедшие подтверждённые брони завершаем
  const done = await db.booking.updateMany({ where: { status: "PREPAID", checkOut: { lt: new Date(Date.now() - 86400000) } }, data: { status: "COMPLETED" } });
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.token.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 7 * 86400000) } } });
  await db.busyDate.deleteMany({ where: { date: { lt: new Date(Date.now() - 2 * 86400000) } } });
  await updateReplyMinutes();
  // Календари с других площадок: не чаще раза в 3 часа на объявление
  const cal = await db.listing.findMany({ where: { icalUrl: { not: null }, status: { in: ["PUBLISHED", "HIDDEN"] }, OR: [{ icalSyncedAt: null }, { icalSyncedAt: { lt: new Date(Date.now() - 3 * 3600000) } }] }, select: { id: true }, take: 200 });
  for (const l of cal) await syncIcal(l.id);
  const alerts = await sendAlerts();
  return Response.json({ ok: true, noResponse: stale.count, completed: done.count, ical: cal.length, alerts });
}
