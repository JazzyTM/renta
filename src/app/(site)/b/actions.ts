"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bookingAccess } from "@/lib/booking";
import { notifyEmail } from "@/lib/notify";
import { sendTemplate } from "@/lib/mail";
import { sign } from "@/lib/sign";
import { getSettings } from "@/lib/settings";
import { recomputeRating } from "@/lib/reviews";
import type { FormState } from "@/lib/form";

export async function postMessage(number: number, k: string | null, fd: FormData) {
  const text = String(fd.get("text") || "").trim().slice(0, 3000);
  if (!text) return;
  const a = await bookingAccess(number, k);
  if (!a || a.role === "staff") return;
  await db.message.create({ data: { bookingId: a.b.id, text, fromOwner: a.role === "owner", authorId: a.user?.id } });
  const base = process.env.APP_URL || "";
  if (a.role === "guest") await notifyEmail(a.b.listing.ownerId, "booking_message", { number, text, link: `${base}/cabinet/bookings/${number}` }, `Сообщение по заявке №${number}`, `/cabinet/bookings/${number}`);
  else await sendTemplate(a.b.guestEmail, "booking_message", { number, text, link: `${base}/b/${number}?k=${sign(number)}` });
  revalidatePath(`/b/${number}`); revalidatePath(`/cabinet/bookings/${number}`);
}

export async function cancelBooking(number: number, k: string | null) {
  const a = await bookingAccess(number, k);
  if (!a || a.role !== "guest" || !["NEW", "ACCEPTED"].includes(a.b.status)) return;
  await db.booking.update({ where: { id: a.b.id }, data: { status: "CANCELLED", messages: { create: { isSystem: true, text: "Гость отменил заявку" } } } });
  await notifyEmail(a.b.listing.ownerId, "booking_message", { number, text: "Гость отменил заявку", link: `${process.env.APP_URL}/cabinet/bookings/${number}` }, `Заявка №${number} отменена`);
  revalidatePath(`/b/${number}`);
}

export async function leaveReview(number: number, k: string | null, _: unknown, fd: FormData): Promise<FormState> {
  const a = await bookingAccess(number, k);
  if (!a || a.role !== "guest") return { error: "Нет доступа" };
  const b = a.b;
  if (!["ACCEPTED", "PREPAID", "COMPLETED"].includes(b.status) || b.checkOut > new Date()) return { error: "Отзыв можно оставить после поездки" };
  if (await db.review.findUnique({ where: { bookingId: b.id } })) return { error: "Отзыв уже оставлен" };
  const rating = Math.min(5, Math.max(1, Number(fd.get("rating")) || 0));
  const text = String(fd.get("text") || "").trim().slice(0, 3000);
  if (text.length < 10) return { error: "Напишите пару предложений" };
  const s = await getSettings();
  await db.review.create({ data: { listingId: b.listingId, bookingId: b.id, authorId: a.user?.id, authorName: b.guestName, rating, text, status: s.reviewsPremoderation ? "PENDING" : "PUBLISHED" } });
  if (!s.reviewsPremoderation) await recomputeRating(b.listingId);
  revalidatePath(`/b/${number}`);
  return { ok: s.reviewsPremoderation ? "Спасибо! Отзыв появится после проверки" : "Спасибо за отзыв!" };
}
