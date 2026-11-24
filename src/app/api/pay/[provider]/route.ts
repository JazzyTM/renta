// Уведомления платёжных сервисов об оплате (Result URL). Отвечаем 200 «OK», иначе сервис повторит запрос.
import { db } from "@/lib/db";
import { PROVIDERS, markOrderPaid } from "@/lib/payments";
import { notifyAdmin } from "@/lib/notify";
import { rub } from "@/lib/format";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const p = PROVIDERS[(await params).provider];
  if (!p?.webhook) return new Response("unknown provider", { status: 404 });
  let r;
  try { r = await p.webhook(req); } catch (e) { console.error("[pay] webhook", e); return new Response("error", { status: 500 }); }
  if (!r) return new Response("bad signature", { status: 400 });
  const o = await db.order.findUnique({ where: { number: r.orderNumber } });
  if (!o) return new Response("OK");
  if (r.paid) {
    if (o.status !== "PAID") { await markOrderPaid(o.id, null, r.raw); await notifyAdmin(`Заказ №${o.number} оплачен`, `${rub(o.amount)} через ${p.title}`, "/admin/orders"); }
  } else if (o.status === "PENDING") {
    await db.order.update({ where: { id: o.id }, data: { status: "FAILED", raw: r.raw as any } });
  }
  return new Response("OK");
}
