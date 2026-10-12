"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, isStaff } from "@/lib/auth";
import { sendTemplate } from "@/lib/mail";
import { sign } from "@/lib/sign";
import { fmtRange, rub } from "@/lib/format";
import { audit } from "@/lib/audit";
import type { FormState } from "@/lib/form";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { ownerPlan } from "@/lib/plan";
import { activeProvider, applyPromoCode, markOrderPaid, promoPrice, PROMO_DAYS } from "@/lib/payments";

async function ownBooking(number: number) {
  const u = await requireUser(`/cabinet/bookings/${number}`);
  const b = await db.booking.findUnique({ where: { number }, include: { listing: { include: { resort: true } } } });
  if (!b || (b.listing.ownerId !== u.id && !isStaff(u.role))) throw new Error("Нет доступа");
  return { u, b };
}
const refresh = (n: number) => { revalidatePath(`/cabinet/bookings/${n}`); revalidatePath("/cabinet/bookings"); revalidatePath(`/b/${n}`); revalidatePath(`/admin/bookings/${n}`); };
const guestLink = (n: number) => `${process.env.APP_URL || ""}/b/${n}?k=${sign(n)}`;

export async function acceptBooking(number: number, _: unknown, fd: FormData): Promise<FormState> {
  const { u, b } = await ownBooking(number);
  if (b.status !== "NEW" && b.status !== "NO_RESPONSE") return { error: "Заявка уже обработана" };
  const prepay = Math.max(0, parseInt(String(fd.get("prepay") || b.prepayAmount), 10) || 0);
  const text = String(fd.get("text") || "").trim().slice(0, 3000);
  await db.booking.update({ where: { id: b.id }, data: {
    status: "ACCEPTED", prepayAmount: prepay, respondedAt: new Date(),
    messages: { create: [{ isSystem: true, text: `Хозяин подтвердил даты. Предоплата: ${prepay ? rub(prepay) : "не нужна"}` }, ...(text ? [{ text, fromOwner: true, authorId: u.id }] : [])] },
  }});
  await sendTemplate(b.guestEmail, "booking_accepted_guest", { listing: b.listing.title, dates: fmtRange(b.checkIn, b.checkOut), prepay: prepay ? rub(prepay) : "не нужна", link: guestLink(number) });
  await audit(u.id, "accept", "Booking", b.id);
  refresh(number);
  return { ok: "Гостю отправлено письмо" };
}

export async function declineBooking(number: number, _: unknown, fd: FormData): Promise<FormState> {
  const { u, b } = await ownBooking(number);
  if (!["NEW", "ACCEPTED", "NO_RESPONSE"].includes(b.status)) return { error: "Заявка уже обработана" };
  const text = String(fd.get("text") || "").trim().slice(0, 3000);
  await db.booking.update({ where: { id: b.id }, data: {
    status: "DECLINED", respondedAt: new Date(),
    messages: { create: [{ isSystem: true, text: "Хозяин отклонил заявку" }, ...(text ? [{ text, fromOwner: true, authorId: u.id }] : [])] },
  }});
  await sendTemplate(b.guestEmail, "booking_declined_guest", { listing: b.listing.title, dates: fmtRange(b.checkIn, b.checkOut), link: `${process.env.APP_URL || ""}/kurort/${b.listing.resort.slug}` });
  await audit(u.id, "decline", "Booking", b.id);
  refresh(number);
  return { ok: "Заявка отклонена" };
}

export async function setBookingStatus(number: number, status: "PREPAID" | "COMPLETED" | "CANCELLED") {
  const { u, b } = await ownBooking(number);
  const text = { PREPAID: "Хозяин получил предоплату. Бронь подтверждена", COMPLETED: "Поездка завершена", CANCELLED: "Хозяин отменил бронь" }[status];
  await db.booking.update({ where: { id: b.id }, data: { status, messages: { create: { isSystem: true, text } } } });
  await sendTemplate(b.guestEmail, "booking_message", { number, text, link: guestLink(number) });
  await audit(u.id, "status:" + status, "Booking", b.id);
  refresh(number);
}

export async function saveOwnerNote(number: number, _: unknown, fd: FormData): Promise<FormState> {
  const { b } = await ownBooking(number);
  await db.booking.update({ where: { id: b.id }, data: { ownerNote: String(fd.get("note") || "").slice(0, 2000) || null } });
  refresh(number);
  return { ok: "Сохранено" };
}

export async function replyReview(id: string, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireUser("/cabinet/reviews");
  const r = await db.review.findUnique({ where: { id }, include: { listing: true } });
  if (!r || (r.listing.ownerId !== u.id && !isStaff(u.role))) return { error: "Нет доступа" };
  await db.review.update({ where: { id }, data: { ownerReply: String(fd.get("reply") || "").trim().slice(0, 2000) || null } });
  revalidatePath("/cabinet/reviews"); revalidatePath(`/obj/${r.listing.number}`);
  return { ok: "Ответ сохранён" };
}

export async function savePayout(_: unknown, fd: FormData): Promise<FormState> {
  const u = await requireUser("/cabinet/payout");
  const g = (k: string, m = 200) => String(fd.get(k) || "").trim().slice(0, m);
  const inn = g("inn", 12), bik = g("bik", 9), account = g("account", 20);
  if (inn && !/^\d{10}(\d{2})?$/.test(inn)) return { error: "ИНН: 10 или 12 цифр" };
  if (bik && !/^\d{9}$/.test(bik)) return { error: "БИК: 9 цифр" };
  if (account && !/^\d{20}$/.test(account)) return { error: "Счёт: 20 цифр" };
  const data = { legalForm: g("legalForm") as any, fullName: g("fullName"), inn, bik, account };
  await db.payoutDetails.upsert({ where: { userId: u.id }, create: { userId: u.id, ...data }, update: data });
  return { ok: "Реквизиты сохранены" };
}

export async function readNotifications() {
  const u = await requireUser();
  await db.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/cabinet/notifications");
}

// ---------- Покупки: тарифы и услуги ----------

async function checkout(userId: string, data: { kind: string; tariffId?: string; listingId?: string; promoType?: string; days: number; amount: number }, code?: string): Promise<FormState> {
  let p;
  try { p = await applyPromoCode(code, data.amount); } catch (e) { return { error: (e as Error).message }; }
  const order = await db.order.create({ data: { userId, ...data, promoType: data.promoType as any, days: data.days + p.freeDays, amount: p.amount, promoCode: p.code } });
  if (order.amount === 0) {
    await markOrderPaid(order.id, userId);
    revalidatePath("/cabinet/tariff"); revalidatePath("/cabinet");
    return { ok: "Готово, услуга включена" };
  }
  const provider = await activeProvider();
  if (!provider) return { ok: `Заказ №${order.number} создан. Онлайн-оплата пока не подключена, мы свяжемся с вами` };
  const r = await provider.createPayment(order, `${process.env.APP_URL || ""}/cabinet/tariff?order=${order.number}`);
  await db.order.update({ where: { id: order.id }, data: { externalId: r.externalId, provider: (await getSettings()).paymentProvider } });
  redirect(r.redirectUrl);
}

export async function buyTariff(tariffId: string, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireUser("/cabinet/tariff");
  const t = await db.tariff.findUnique({ where: { id: tariffId } });
  if (!t || !t.isActive) return { error: "Тариф недоступен" };
  return checkout(u.id, { kind: "tariff", tariffId, days: t.periodDays, amount: t.price }, String(fd.get("code") || "") || undefined);
}

export async function buyPromotion(listingId: string, type: string, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireUser("/cabinet");
  const l = await db.listing.findUnique({ where: { id: listingId } });
  if (!l || l.ownerId !== u.id) return { error: "Нет доступа" };
  if (l.status !== "PUBLISHED") return { error: "Сначала опубликуйте объявление" };
  const s = await getSettings();
  const plan = await ownerPlan(u.id);
  const amount = plan.free && s.freePromotions ? 0 : await promoPrice(type);
  return checkout(u.id, { kind: "promotion", listingId, promoType: type, days: PROMO_DAYS[type] ?? 7, amount }, String(fd.get("code") || "") || undefined);
}
