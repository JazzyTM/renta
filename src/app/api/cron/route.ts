import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { expirePromotions } from "@/lib/payments";

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
  return Response.json({ ok: true, noResponse: stale.count, completed: done.count });
}
