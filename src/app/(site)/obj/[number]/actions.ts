"use server";
import type { FormState } from "@/lib/form";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { quote } from "@/lib/pricing";
import { parseDate, fmtRange } from "@/lib/format";
import { sign } from "@/lib/sign";
import { notifyEmail } from "@/lib/notify";

const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

export async function revealPhone(listingId: string) {
  const s = await getSettings();
  const u = await getUser();
  if (!s.showPhone) return { error: "Телефон скрыт, отправьте заявку" };
  if (s.phoneNeedsLogin && !u) return { error: "Войдите, чтобы увидеть телефон" };
  const l = await db.listing.update({ where: { id: listingId }, data: { phoneViews: { increment: 1 } }, select: { contactPhone: true, contactName: true, whatsapp: true, telegram: true } });
  const d = today();
  await db.listingStatDaily.upsert({ where: { listingId_date: { listingId, date: d } }, create: { listingId, date: d, phoneViews: 1 }, update: { phoneViews: { increment: 1 } } });
  return { phone: l.contactPhone, name: l.contactName, whatsapp: l.whatsapp, telegram: l.telegram };
}

const Req = z.object({
  listingId: z.string(), ci: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Выберите даты"), co: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Выберите даты"),
  adults: z.coerce.number().int().min(1).max(30), children: z.coerce.number().int().min(0).max(30),
  name: z.string().trim().min(2, "Напишите, как к вам обращаться").max(80), email: z.string().trim().email("Проверьте почту"),
  phone: z.string().trim().max(30).optional().default(""), comment: z.string().trim().max(2000).optional().default(""),
});

export async function createBooking(_: unknown, fd: FormData): Promise<FormState> {
  const s = await getSettings();
  const u = await getUser();
  if (!s.bookingRequests) return { error: "Заявки сейчас не принимаются, позвоните хозяину" };
  if (s.guestNeedsLogin && !u) return { error: "Войдите, чтобы отправить заявку" };
  const p = Req.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const v = p.data;
  const ci = parseDate(v.ci), co = parseDate(v.co);
  if (co <= ci) return { error: "Дата выезда должна быть позже заезда" };
  if (ci < today()) return { error: "Дата заезда уже прошла" };
  const l = await db.listing.findUnique({ where: { id: v.listingId }, include: { prices: true } });
  if (!l || l.status !== "PUBLISHED") return { error: "Объявление недоступно" };
  if (v.adults + v.children > l.maxGuests) return { error: `Здесь можно разместить не больше ${l.maxGuests} гостей` };
  const q = quote(l, ci, co, v.adults + v.children)!;
  const b = await db.booking.create({ data: {
    listingId: l.id, guestId: u?.id, guestName: v.name, guestEmail: v.email, guestPhone: v.phone, checkIn: ci, checkOut: co,
    adults: v.adults, children: v.children, comment: v.comment, totalEstimate: q.total, prepayAmount: q.prepay,
    messages: v.comment ? { create: { text: v.comment, authorId: u?.id } } : undefined,
  }});
  const d = today();
  await db.listingStatDaily.upsert({ where: { listingId_date: { listingId: l.id, date: d } }, create: { listingId: l.id, date: d, requests: 1 }, update: { requests: { increment: 1 } } });
  const base = process.env.APP_URL || "";
  await notifyEmail(l.ownerId, "booking_new_owner", { guest: v.name, listing: l.title, dates: fmtRange(ci, co), guests: v.adults + v.children, comment: v.comment || "—", link: `${base}/cabinet/bookings/${b.number}` }, `Новая заявка №${b.number}`, `/cabinet/bookings/${b.number}`);
  redirect(`/b/${b.number}?k=${sign(b.number)}`);
}

export async function toggleFavorite(listingId: string) {
  const u = await getUser();
  if (!u) return { login: true };
  const key = { userId_listingId: { userId: u.id, listingId } };
  const ex = await db.favorite.findUnique({ where: key });
  if (ex) await db.favorite.delete({ where: key }); else await db.favorite.create({ data: { userId: u.id, listingId } });
  return { fav: !ex };
}

export async function complain(_: unknown, fd: FormData): Promise<FormState> {
  const u = await getUser();
  const reason = String(fd.get("reason") || "").slice(0, 100), text = String(fd.get("text") || "").slice(0, 2000);
  if (!reason) return { error: "Выберите причину" };
  await db.complaint.create({ data: { listingId: String(fd.get("listingId")), authorId: u?.id, email: u?.email ?? (String(fd.get("email") || "") || null), reason, text } });
  return { ok: "sent" };
}
