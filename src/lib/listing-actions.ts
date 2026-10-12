"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "./db";
import { requireUser, isStaff } from "./auth";
import { getSettings } from "./settings";
import { saveImage, removeImage } from "./upload";
import { slugify } from "./slug";
import { minPrice } from "./pricing";
import { audit } from "./audit";
import { ownerPlan } from "./plan";
import type { FormState } from "./form";

async function canEdit(id: string) {
  const u = await requireUser();
  const l = await db.listing.findUnique({ where: { id }, include: { photos: true } });
  if (!l || (l.ownerId !== u.id && !isStaff(u.role))) throw new Error("Нет доступа");
  return { u, l };
}
const paths = (id: string) => { revalidatePath(`/cabinet/listings/${id}`); revalidatePath(`/admin/listings/${id}`); };
const int = (v: FormDataEntryValue | null, d = 0) => { const n = parseInt(String(v ?? ""), 10); return Number.isFinite(n) ? n : d; };
const str = (v: FormDataEntryValue | null, max = 500) => String(v ?? "").trim().slice(0, max);

export async function createListing(_: unknown, fd: FormData): Promise<FormState> {
  const u = await requireUser("/cabinet/new");
  const title = str(fd.get("title"), 120), resortSlug = str(fd.get("resort")), type = str(fd.get("type"));
  if (title.length < 3) return { error: "Напишите название" };
  const resort = await db.resort.findUnique({ where: { slug: resortSlug } });
  if (!resort) return { error: "Выберите курорт из списка" };
  const count = await db.listing.count({ where: { ownerId: u.id, status: { not: "ARCHIVED" } } });
  const plan = await ownerPlan(u.id);
  if (!isStaff(u.role) && count >= plan.maxListings) return { error: `На тарифе «${plan.name}» можно до ${plan.maxListings} объявлений. Тарифы: /cabinet/tariff` };
  const l = await db.listing.create({ data: {
    ownerId: u.id, resortId: resort.id, type: type as any, title, slug: `${slugify(title)}-${Date.now().toString(36)}`,
    contactPhone: u.phone ?? "", contactName: u.name,
  }});
  if (u.role === "GUEST") await db.user.update({ where: { id: u.id }, data: { role: "OWNER" } });
  await audit(u.id, "create", "Listing", l.id);
  redirect(`/cabinet/listings/${l.id}`);
}

const Main = z.object({
  title: z.string().trim().min(3, "Название слишком короткое").max(120), type: z.string(), resortId: z.string(),
  description: z.string().trim().max(10000), address: z.string().trim().max(300),
  lat: z.string().optional(), lng: z.string().optional(), seaDistance: z.string().optional(), beachType: z.string().optional(),
  maxGuests: z.coerce.number().int().min(1).max(200), baseGuests: z.coerce.number().int().min(1).max(200), extraGuestPrice: z.coerce.number().int().min(0),
  minNights: z.coerce.number().int().min(1).max(60),
});

export async function saveMain(id: string, _: unknown, fd: FormData): Promise<FormState> {
  const { u } = await canEdit(id);
  const p = Main.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const v = p.data;
  const num = (x?: string) => (x && x.trim() !== "" ? Number(x.replace(",", ".")) : null);
  await db.listing.update({ where: { id }, data: {
    title: v.title, type: v.type as any, resortId: v.resortId, description: v.description, address: v.address,
    lat: num(v.lat), lng: num(v.lng), seaDistance: num(v.seaDistance), beachType: (v.beachType || null) as any,
    maxGuests: v.maxGuests, baseGuests: Math.min(v.baseGuests, v.maxGuests), extraGuestPrice: v.extraGuestPrice, minNights: v.minNights,
  }});
  await audit(u.id, "update", "Listing", id, { section: "main" });
  paths(id);
  return { ok: "Сохранено" };
}

export async function savePrices(id: string, _: unknown, fd: FormData): Promise<FormState> {
  await canEdit(id);
  const rows = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, price: int(fd.get(`m${i + 1}`)) })).filter(r => r.price > 0);
  await db.$transaction([
    db.seasonPrice.deleteMany({ where: { listingId: id } }),
    db.seasonPrice.createMany({ data: rows.map(r => ({ ...r, listingId: id })) }),
    db.listing.update({ where: { id }, data: { priceFrom: minPrice(rows) } }),
  ]);
  paths(id);
  return { ok: "Цены сохранены" };
}

export async function saveRules(id: string, _: unknown, fd: FormData): Promise<FormState> {
  await canEdit(id);
  const prepayType = str(fd.get("prepayType")) as any;
  await db.listing.update({ where: { id }, data: {
    prepayType, prepayPercent: Math.min(100, int(fd.get("prepayPercent"))), cancelDays: int(fd.get("cancelDays"), 7),
    checkInTime: str(fd.get("checkInTime"), 5) || "14:00", checkOutTime: str(fd.get("checkOutTime"), 5) || "12:00",
    childrenAllowed: fd.get("childrenAllowed") === "on", petsAllowed: fd.get("petsAllowed") === "on", smokingAllowed: fd.get("smokingAllowed") === "on",
    contactPhone: str(fd.get("contactPhone"), 30), contactName: str(fd.get("contactName"), 60), whatsapp: fd.get("whatsapp") === "on", telegram: str(fd.get("telegram"), 60) || null,
  }});
  paths(id);
  return { ok: "Сохранено" };
}

export async function saveAmenities(id: string, _: unknown, fd: FormData): Promise<FormState> {
  await canEdit(id);
  const ids = fd.getAll("a").map(String);
  await db.$transaction([
    db.listingAmenity.deleteMany({ where: { listingId: id } }),
    db.listingAmenity.createMany({ data: ids.map(amenityId => ({ listingId: id, amenityId })) }),
  ]);
  paths(id);
  return { ok: `Отмечено: ${ids.length}` };
}

export async function addRoom(id: string, fd: FormData) {
  await canEdit(id);
  const name = str(fd.get("name"), 100);
  if (!name) return;
  await db.room.create({ data: { listingId: id, name, guests: int(fd.get("guests"), 2), count: int(fd.get("count"), 1), price: int(fd.get("price")) } });
  paths(id);
}
export async function deleteRoom(id: string, roomId: string) {
  await canEdit(id);
  await db.room.deleteMany({ where: { id: roomId, listingId: id } });
  paths(id);
}

export async function uploadPhotos(id: string, _: unknown, fd: FormData): Promise<FormState> {
  const { l } = await canEdit(id);
  const max = (await ownerPlan(l.ownerId)).maxPhotos;
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Выберите фото" };
  if (l.photos.length + files.length > max) return { error: `Не больше ${max} фото` };
  try {
    let sort = l.photos.length;
    for (const f of files) await db.listingPhoto.create({ data: { listingId: id, url: await saveImage(f), sort: sort++ } });
  } catch (e) { return { error: (e as Error).message }; }
  paths(id);
  return { ok: `Загружено фото: ${files.length}` };
}
export async function deletePhoto(id: string, photoId: string) {
  await canEdit(id);
  const p = await db.listingPhoto.findFirst({ where: { id: photoId, listingId: id } });
  if (p) { await db.listingPhoto.delete({ where: { id: p.id } }); await removeImage(p.url); }
  paths(id);
}
export async function movePhoto(id: string, photoId: string, dir: number) {
  const { l } = await canEdit(id);
  const list = [...l.photos].sort((a, b) => a.sort - b.sort);
  const i = list.findIndex(p => p.id === photoId), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((p, k) => db.listingPhoto.update({ where: { id: p.id }, data: { sort: k } })));
  paths(id);
}

// Публикация: проверки правил сайта, стоп-слова, постмодерация
export async function publish(id: string): Promise<FormState> {
  const { u, l } = await canEdit(id);
  const s = await getSettings();
  const full = await db.listing.findUnique({ where: { id }, include: { prices: true } });
  const problems: string[] = [];
  if (l.photos.length < Number(s.minPhotos)) problems.push(`добавьте минимум ${s.minPhotos} фото`);
  if (l.description.length < Number(s.minDescription)) problems.push(`описание не короче ${s.minDescription} символов`);
  if (!full?.prices.length) problems.push("укажите цены хотя бы на один месяц");
  if (!l.contactPhone) problems.push("укажите телефон для гостей");
  if (problems.length) return { error: "Чтобы опубликовать: " + problems.join(", ") };
  const words = await db.stopWord.findMany();
  const text = (l.title + " " + l.description).toLowerCase();
  const hit = words.find(w => text.includes(w.word.toLowerCase()));
  if (hit && (hit.action === "block" || s.stopWordsAction === "block")) return { error: "В тексте есть запрещённые фразы. Уберите требования полной предоплаты и ссылки на мессенджеры" };
  await db.listing.update({ where: { id }, data: {
    status: "PUBLISHED", publishedAt: l.publishedAt ?? new Date(),
    moderation: l.moderation === "APPROVED" && !hit ? "APPROVED" : "PENDING", moderationNote: hit ? `Стоп-слово: ${hit.word}` : l.moderationNote,
  }});
  await audit(u.id, "publish", "Listing", id);
  paths(id);
  return { ok: s.postModeration ? "Опубликовано. Модератор проверит объявление в ближайшее время" : "Отправлено на проверку. После проверки объявление появится в поиске" };
}

export async function setStatus(id: string, status: "HIDDEN" | "ARCHIVED" | "DRAFT") {
  const { u } = await canEdit(id);
  await db.listing.update({ where: { id }, data: { status } });
  await audit(u.id, "status:" + status, "Listing", id);
  paths(id); revalidatePath("/cabinet");
}
