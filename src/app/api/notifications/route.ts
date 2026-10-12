import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

// Непрочитанные уведомления для значка в шапке. since — время последней проверки, чтобы показать новые всплывающим окном
export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return Response.json({ unread: 0, items: [] });
  const since = Number(new URL(req.url).searchParams.get("since")) || 0;
  const [unread, items] = await Promise.all([
    db.notification.count({ where: { userId: u.id, readAt: null } }),
    since ? db.notification.findMany({ where: { userId: u.id, readAt: null, createdAt: { gt: new Date(since) } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, link: true } }) : Promise.resolve([]),
  ]);
  return Response.json({ unread, items, now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
