"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff, requireAdmin, createSession, createToken, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { CRUD, parseFields, delegate } from "@/lib/crud";
import { sendTemplate, sendMail, fill } from "@/lib/mail";
import { SETTINGS, saveSettings, getSettings } from "@/lib/settings";
import { enablePromotion, markOrderPaid } from "@/lib/payments";
import { recomputeRating } from "@/lib/reviews";
import { fmtRange } from "@/lib/format";
import type { FormState } from "@/lib/form";

const base = () => process.env.APP_URL || "";
const s = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);

// ---------- Справочники ----------
export async function crudSave(entity: string, id: string | null, _: unknown, fd: FormData): Promise<FormState> {
  const e = CRUD[entity];
  const u = e.adminOnly ? await requireAdmin() : await requireStaff();
  let data;
  try { data = parseFields(e.fields, fd); } catch (err) { return { error: (err as Error).message }; }
  let row;
  try {
    row = id ? await delegate(e.model).update({ where: { id }, data }) : await delegate(e.model).create({ data });
  } catch (err: any) {
    if (err?.code === "P2002") return { error: "Такое значение уже есть (адрес или код должен быть уникальным)" };
    return { error: "Не сохранилось: " + String(err?.message ?? err).slice(0, 200) };
  }
  await audit(u.id, id ? "update" : "create", e.model, row.id, data);
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/c/${entity}/${row.id}?saved=1`);
  return { ok: "Сохранено" };
}

export async function crudDelete(entity: string, id: string) {
  const e = CRUD[entity];
  const u = e.adminOnly ? await requireAdmin() : await requireStaff();
  let ok = true;
  try { await delegate(e.model).delete({ where: { id } }); } catch { ok = false; }
  if (!ok) redirect(`/admin/c/${entity}/${id}?err=used`);
  await audit(u.id, "delete", e.model, id);
  revalidatePath("/", "layout");
  redirect(`/admin/c/${entity}`);
}

// ---------- Модерация и объявления ----------
export async function moderate(id: string, decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "BLOCK", _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireStaff();
  const note = s(fd, "note");
  if (decision !== "APPROVED" && !note) return { error: "Напишите причину, её увидит хозяин" };
  const l = await db.listing.findUniqueOrThrow({ where: { id } });
  await db.listing.update({ where: { id }, data: {
    moderation: decision === "BLOCK" ? "REJECTED" : decision, moderationNote: note || null, moderatedAt: new Date(), moderatedById: u.id,
    ...(decision === "BLOCK" ? { status: "BLOCKED" as const } : decision === "REJECTED" ? { status: "HIDDEN" as const } : {}),
    ...(decision === "APPROVED" && fd.get("verified") === "on" ? { verified: true } : {}),
  }});
  const link = `${base()}/cabinet/listings/${id}`;
  if (decision === "APPROVED") await notifyOwner(l.ownerId, "listing_approved", { listing: l.title, link }, `Объявление «${l.title}» проверено`, `/cabinet/listings/${id}`);
  else await notifyOwner(l.ownerId, "listing_rejected", { listing: l.title, reason: note, link }, `Объявление «${l.title}»: нужны правки`, `/cabinet/listings/${id}`);
  await audit(u.id, "moderate:" + decision, "Listing", id, { note });
  revalidatePath("/admin/moderation"); revalidatePath(`/admin/listings/${id}`);
  return { ok: "Готово" };
}

async function notifyOwner(userId: string, key: string, vars: Record<string, string>, title: string, link: string) {
  const o = await db.user.findUnique({ where: { id: userId } });
  await db.notification.create({ data: { userId, title, link } });
  if (o?.email) await sendTemplate(o.email, key, vars);
}

export async function listingAdmin(id: string, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireStaff();
  const ownerEmail = s(fd, "ownerEmail", 200).toLowerCase();
  let ownerId: string | undefined;
  if (ownerEmail) {
    const o = await db.user.findUnique({ where: { email: ownerEmail } });
    if (!o) return { error: "Пользователь с такой почтой не найден" };
    ownerId = o.id;
  }
  const data = {
    status: s(fd, "status") as any, moderation: s(fd, "moderation") as any, verified: fd.get("verified") === "on", isFeatured: fd.get("isFeatured") === "on",
    seoTitle: s(fd, "seoTitle", 200) || null, seoDescription: s(fd, "seoDescription", 400) || null, ...(ownerId ? { ownerId } : {}),
  };
  await db.listing.update({ where: { id }, data });
  await audit(u.id, "admin-update", "Listing", id, data);
  revalidatePath(`/admin/listings/${id}`);
  return { ok: "Сохранено" };
}

export async function grantPromotion(id: string, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireAdmin();
  const type = s(fd, "type"), days = Math.max(1, Number(fd.get("days")) || 7);
  await enablePromotion(id, type, days, 0);
  await audit(u.id, "grant-promotion", "Listing", id, { type, days });
  revalidatePath(`/admin/listings/${id}`);
  return { ok: "Услуга включена бесплатно" };
}

export async function deleteListing(id: string) {
  const u = await requireAdmin();
  const n = await db.booking.count({ where: { listingId: id } });
  if (n) await db.listing.update({ where: { id }, data: { status: "ARCHIVED" } });
  else await db.listing.delete({ where: { id } });
  await audit(u.id, n ? "archive" : "delete", "Listing", id);
  redirect("/admin/listings");
}

export async function bulkListings(fd: FormData) {
  const u = await requireStaff();
  const ids = fd.getAll("ids").map(String), op = s(fd, "op");
  if (!ids.length) return;
  const data: Record<string, any> =
    op === "approve" ? { moderation: "APPROVED", moderatedAt: new Date(), moderatedById: u.id } :
    op === "hide" ? { status: "HIDDEN" } : op === "block" ? { status: "BLOCKED" } : op === "publish" ? { status: "PUBLISHED" } :
    op === "verify" ? { verified: true } : op === "unverify" ? { verified: false } : {};
  await db.listing.updateMany({ where: { id: { in: ids } }, data });
  await audit(u.id, "bulk:" + op, "Listing", null, { ids });
  revalidatePath("/admin/listings"); revalidatePath("/admin/moderation");
}

// ---------- Заявки ----------
export async function bookingAdmin(number: number, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireStaff();
  const b = await db.booking.findUniqueOrThrow({ where: { number } });
  const status = s(fd, "status") as any;
  await db.booking.update({ where: { number }, data: { status, adminNote: s(fd, "adminNote") || null, ...(status !== b.status ? { messages: { create: { isSystem: true, text: `Администратор сменил статус` } } } : {}) } });
  await audit(u.id, "admin-update", "Booking", b.id, { status });
  revalidatePath(`/admin/bookings/${number}`);
  return { ok: "Сохранено" };
}

// ---------- Пользователи ----------
export async function userAdmin(id: string, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireStaff();
  const target = await db.user.findUniqueOrThrow({ where: { id } });
  const role = s(fd, "role") as any;
  if (role !== target.role && u.role !== "ADMIN") return { error: "Роли меняет только администратор" };
  if (id === u.id && role !== "ADMIN" && u.role === "ADMIN") return { error: "Нельзя снять права с самого себя" };
  const status = s(fd, "status") as any;
  const email = s(fd, "email", 200).toLowerCase() || null;
  try {
    await db.user.update({ where: { id }, data: { name: s(fd, "name", 100), email, phone: s(fd, "phone", 30) || null, role, status, blockReason: status === "BLOCKED" ? s(fd, "blockReason") || null : null, adminNote: s(fd, "adminNote") || null, ...(fd.get("emailVerified") === "on" && !target.emailVerified ? { emailVerified: new Date() } : {}) } });
  } catch { return { error: "Такая почта уже занята" }; }
  if (status === "BLOCKED") await db.session.deleteMany({ where: { userId: id } });
  await audit(u.id, "admin-update", "User", id, { role, status });
  revalidatePath(`/admin/users/${id}`);
  return { ok: "Сохранено" };
}

export async function grantSubscription(userId: string, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireAdmin();
  const tariffId = s(fd, "tariffId"), days = Math.max(1, Number(fd.get("days")) || 30);
  const t = await db.tariff.findUnique({ where: { id: tariffId } });
  if (!t) return { error: "Выберите тариф" };
  await db.subscription.create({ data: { userId, tariffId, endsAt: new Date(Date.now() + days * 86400000), amount: 0, note: s(fd, "note") || `Выдан администратором` } });
  await db.notification.create({ data: { userId, title: `Вам подключён тариф «${t.name}» на ${days} дн.`, link: "/cabinet/tariff" } });
  await audit(u.id, "grant-tariff", "User", userId, { tariffId, days });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: "Тариф выдан" };
}

export async function endSubscription(userId: string, subId: string) {
  const u = await requireAdmin();
  await db.subscription.update({ where: { id: subId }, data: { endsAt: new Date() } });
  await audit(u.id, "end-tariff", "User", userId, { subId });
  revalidatePath(`/admin/users/${userId}`);
}

export async function revokeSessions(userId: string) {
  const u = await requireStaff();
  await db.session.deleteMany({ where: { userId } });
  await audit(u.id, "revoke-sessions", "User", userId);
  revalidatePath(`/admin/users/${userId}`);
}

export async function sendReset(userId: string) {
  const u = await requireStaff();
  const t = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (t.email) await sendTemplate(t.email, "password_reset", { link: `${base()}/reset?t=${await createToken(userId, "PASSWORD_RESET", 2)}` });
  await audit(u.id, "send-reset", "User", userId);
  revalidatePath(`/admin/users/${userId}`);
}

export async function setPassword(userId: string, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireAdmin();
  const p = s(fd, "password", 200);
  if (p.length < 8) return { error: "Не короче 8 символов" };
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(p) } });
  await audit(u.id, "set-password", "User", userId);
  return { ok: "Пароль задан" };
}

// Войти под пользователем, чтобы увидеть, что видит он. Пишется в журнал.
export async function impersonate(userId: string) {
  const u = await requireAdmin();
  await audit(u.id, "impersonate", "User", userId);
  await createSession(userId);
  redirect("/cabinet");
}

export async function createUser(_: unknown, fd: FormData): Promise<FormState> {
  const u = await requireAdmin();
  const email = s(fd, "email", 200).toLowerCase(), password = s(fd, "password", 200);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Проверьте почту" };
  if (password.length < 8) return { error: "Пароль не короче 8 символов" };
  if (await db.user.findUnique({ where: { email } })) return { error: "Такая почта уже есть" };
  const n = await db.user.create({ data: { email, name: s(fd, "name", 100), role: s(fd, "role") as any, emailVerified: new Date(), passwordHash: await hashPassword(password) } });
  await audit(u.id, "create", "User", n.id);
  redirect(`/admin/users/${n.id}`);
}

// ---------- Отзывы и жалобы ----------
export async function reviewSet(id: string, status: "PUBLISHED" | "HIDDEN" | "DELETE") {
  const u = await requireStaff();
  const r = await db.review.findUniqueOrThrow({ where: { id } });
  if (status === "DELETE") await db.review.delete({ where: { id } }); else await db.review.update({ where: { id }, data: { status } });
  await recomputeRating(r.listingId);
  await audit(u.id, "review:" + status, "Review", id);
  revalidatePath("/admin/reviews");
}

export async function complaintSet(id: string, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireStaff();
  await db.complaint.update({ where: { id }, data: { status: s(fd, "status") as any, resolution: s(fd, "resolution") || null } });
  await audit(u.id, "update", "Complaint", id);
  revalidatePath("/admin/complaints");
  return { ok: "Сохранено" };
}

// ---------- Заказы ----------
export async function orderPaid(id: string) {
  const u = await requireAdmin();
  await markOrderPaid(id, u.id, { manual: true, by: u.email });
  revalidatePath("/admin/orders");
}
export async function orderCancel(id: string) {
  const u = await requireAdmin();
  await db.order.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit(u.id, "cancel", "Order", id);
  revalidatePath("/admin/orders");
}
export async function endPromotion(id: string) {
  const u = await requireAdmin();
  const p = await db.promotion.update({ where: { id }, data: { endsAt: new Date() } });
  const data = p.type === "HIGHLIGHT" ? { highlightedUntil: null } : p.type === "BOOST" ? { boostedAt: null } : { promotedUntil: null, isFeatured: false };
  await db.listing.update({ where: { id: p.listingId }, data });
  await audit(u.id, "end", "Promotion", id);
  revalidatePath("/admin/promotions");
}

// ---------- Рассылки ----------
export async function campaignSave(id: string | null, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireAdmin();
  const data = { subject: s(fd, "subject", 200), body: s(fd, "body", 20000), audience: s(fd, "audience") };
  if (!data.subject || !data.body) return { error: "Заполните тему и текст" };
  const c = id ? await db.campaign.update({ where: { id }, data }) : await db.campaign.create({ data });
  await audit(u.id, id ? "update" : "create", "Campaign", c.id);
  if (!id) redirect(`/admin/campaigns/${c.id}`);
  revalidatePath(`/admin/campaigns/${c.id}`);
  return { ok: "Сохранено" };
}

export const audienceWhere = async (a: string) => ({
  status: "ACTIVE" as const, email: { not: null }, emailVerified: { not: null },
  ...(a === "owners" ? { listings: { some: {} } } : a === "guests" ? { listings: { none: {} } } : a === "staff" ? { role: { in: ["ADMIN" as const, "MODERATOR" as const] } } : {}),
});

export async function campaignTest(id: string) {
  const u = await requireAdmin();
  const c = await db.campaign.findUniqueOrThrow({ where: { id } });
  if (u.email) await sendMail(u.email, "[тест] " + c.subject, fill(c.body, { name: u.name }));
  revalidatePath(`/admin/campaigns/${id}`);
}

export async function campaignSend(id: string) {
  const u = await requireAdmin();
  const c = await db.campaign.findUniqueOrThrow({ where: { id } });
  if (c.status === "SENT") return;
  await db.campaign.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
  const users = await db.user.findMany({ where: await audienceWhere(c.audience), select: { email: true, name: true } });
  const site = (await getSettings()).siteName;
  let n = 0;
  for (const r of users) { await sendMail(r.email!, c.subject, fill(c.body, { name: r.name || "", site }) + `\n\n—\nВы получили письмо как пользователь ${site}.`); n++; }
  await db.campaign.update({ where: { id }, data: { sentCount: n } });
  await audit(u.id, "send", "Campaign", id, { n });
  revalidatePath(`/admin/campaigns/${id}`);
}

// ---------- Письма ----------
export async function templateSave(key: string, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireAdmin();
  const data = { subject: s(fd, "subject", 300), body: s(fd, "body", 20000) };
  await db.emailTemplate.upsert({ where: { key }, create: { key, ...data }, update: data });
  await audit(u.id, "update", "EmailTemplate", key);
  return { ok: "Сохранено" };
}
export async function templateReset(key: string) {
  await requireAdmin();
  await db.emailTemplate.deleteMany({ where: { key } });
  revalidatePath(`/admin/emails/${key}`);
}

// ---------- Настройки ----------
export async function settingsSave(section: string, _: unknown, fd: FormData): Promise<FormState> {
  const u = await requireAdmin();
  const sec = SETTINGS.find(x => x.id === section);
  if (!sec) return { error: "Нет такого раздела" };
  const values: Record<string, unknown> = {};
  for (const f of sec.fields) {
    const raw = fd.get(f.key);
    if (f.type === "bool") values[f.key] = raw === "on";
    else if (f.type === "number") values[f.key] = Number(raw) || 0;
    else if (f.type === "password") { if (raw) values[f.key] = String(raw); }
    else values[f.key] = String(raw ?? "").trim();
  }
  if (values.freePlacementUntil && !/^\d{4}-\d{2}-\d{2}$/.test(String(values.freePlacementUntil))) return { error: "Дата бесплатного периода в формате ГГГГ-ММ-ДД" };
  await saveSettings(values);
  await audit(u.id, "update", "Settings", section, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, /pass|secret|token/i.test(k) ? "***" : v])));
  revalidatePath("/", "layout");
  return { ok: "Сохранено" };
}

export async function testMail(_: unknown, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const to = s(fd, "to", 200);
  await sendMail(to, "Проверка почты", "Если вы читаете это письмо, почта на сайте настроена.");
  const last = await db.emailLog.findFirst({ orderBy: { createdAt: "desc" } });
  return last?.status === "failed" ? { error: "Ошибка: " + last.error } : last?.status === "logged" ? { ok: "SMTP не настроен: письмо записано в журнал" } : { ok: "Отправлено" };
}

export async function bookingRemind() {
  const u = await requireStaff();
  const s2 = await getSettings();
  const since = new Date(Date.now() - Number(s2.responseHours) * 3600000);
  const list = await db.booking.findMany({ where: { status: "NEW", createdAt: { lt: since } }, include: { listing: { include: { owner: true } } } });
  for (const b of list) if (b.listing.owner.email) await sendMail(b.listing.owner.email, `Гость ждёт ответа по заявке №${b.number}`, `${b.guestName} ждёт ответа: «${b.listing.title}», ${fmtRange(b.checkIn, b.checkOut)}.\n\n${base()}/cabinet/bookings/${b.number}`);
  await audit(u.id, "remind", "Booking", null, { n: list.length });
  revalidatePath("/admin/bookings");
}
