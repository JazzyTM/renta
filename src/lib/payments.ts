import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";
import { audit } from "./audit";
import type { Order } from "@/generated/prisma/client";

// Платёжный провайдер подключается здесь. Чтобы добавить новый:
// 1) реализуйте PaymentProvider, 2) добавьте его в PROVIDERS, 3) добавьте пункт в настройку paymentProvider,
// 4) вебхук провайдера: /api/pay/[provider] вызывает provider.webhook и затем markOrderPaid.
export interface PaymentProvider {
  title: string;
  createPayment(order: Order, returnUrl: string): Promise<{ redirectUrl: string; externalId: string }>;
  webhook?(req: Request): Promise<{ orderNumber: number; paid: boolean; raw: unknown } | null>;
}

export const PROVIDERS: Record<string, PaymentProvider> = {};

export async function activeProvider() {
  const s = await getSettings();
  return PROVIDERS[s.paymentProvider] ?? null;
}

// Цена услуги: из настроек. Скидка промокодом.
export const PROMO_DAYS: Record<string, number> = { BOOST: 0, HIGHLIGHT: 7, FEATURED: 7, TOP: 7 };
export async function promoPrice(type: string) {
  const s = await getSettings();
  return Number({ BOOST: s.boostPrice, HIGHLIGHT: s.highlightPrice, FEATURED: s.featuredPrice, TOP: s.topPrice }[type] ?? 0);
}

export async function applyPromoCode(code: string | undefined, amount: number) {
  if (!code) return { amount, code: null as string | null, freeDays: 0 };
  const p = await db.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!p || !p.isActive || (p.validUntil && p.validUntil < new Date()) || (p.maxUses && p.used >= p.maxUses)) throw new Error("Промокод не действует");
  return { amount: Math.round(amount * (100 - p.discountPct) / 100), code: p.code, freeDays: p.freeDays };
}

// Включает купленное: продлевает тариф или включает услугу объявлению
export async function markOrderPaid(orderId: string, byUserId?: string | null, raw?: unknown) {
  const o = await db.order.findUnique({ where: { id: orderId } });
  if (!o || o.status === "PAID") return;
  const now = new Date();
  if (o.kind === "tariff" && o.tariffId) {
    const t = await db.tariff.findUniqueOrThrow({ where: { id: o.tariffId } });
    const last = await db.subscription.findFirst({ where: { userId: o.userId, endsAt: { gt: now } }, orderBy: { endsAt: "desc" } });
    const start = last && last.tariffId === t.id ? last.endsAt : now;
    await db.subscription.create({ data: { userId: o.userId, tariffId: t.id, startsAt: start, endsAt: new Date(start.getTime() + (o.days || t.periodDays) * 86400000), amount: o.amount, note: `Заказ №${o.number}` } });
  }
  if (o.kind === "promotion" && o.listingId && o.promoType) await enablePromotion(o.listingId, o.promoType, o.days, o.amount);
  if (o.promoCode) await db.promoCode.update({ where: { code: o.promoCode }, data: { used: { increment: 1 } } }).catch(() => {});
  await db.order.update({ where: { id: o.id }, data: { status: "PAID", paidAt: now, raw: (raw ?? o.raw ?? undefined) as any } });
  await db.notification.create({ data: { userId: o.userId, title: `Заказ №${o.number} оплачен`, body: "", link: "/cabinet/tariff" } });
  await audit(byUserId ?? null, "paid", "Order", o.id);
}

export async function enablePromotion(listingId: string, type: string, days: number, price = 0) {
  const now = new Date();
  const ends = new Date(now.getTime() + Math.max(days, 1) * 86400000);
  await db.promotion.create({ data: { listingId, type: type as any, endsAt: ends, price } });
  const data =
    type === "BOOST" ? { boostedAt: now } :
    type === "HIGHLIGHT" ? { highlightedUntil: ends } :
    type === "FEATURED" ? { isFeatured: true, promotedUntil: ends } :
    { promotedUntil: ends, boostedAt: now };
  await db.listing.update({ where: { id: listingId }, data });
}

// Снимает истёкшие услуги. Вызывается по расписанию (scripts/cron.ts) и при открытии админки.
export async function expirePromotions() {
  const now = new Date();
  await db.listing.updateMany({ where: { promotedUntil: { lt: now } }, data: { isFeatured: false, promotedUntil: null } });
  await db.listing.updateMany({ where: { highlightedUntil: { lt: now } }, data: { highlightedUntil: null } });
}
