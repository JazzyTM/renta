"use server";
// Помощники хозяина: черновик описания с помощью нейросети и перенос объявления с другого сайта по ссылке
import { redirect } from "next/navigation";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { db } from "./db";
import { requireUser, isStaff } from "./auth";
import { getSettings } from "./settings";
import { limit, TOO_MANY } from "./guard";
import { saveImage } from "./upload";
import { slugify } from "./slug";
import { ownerPlan } from "./plan";
import { audit } from "./audit";
import { LISTING_TYPES, BEACH_TYPES } from "./labels";
import type { FormState } from "./form";

// ---------- Черновик описания ----------
export async function aiDescribe(id: string, notes: string): Promise<{ text?: string; error?: string }> {
  const u = await requireUser();
  const l = await db.listing.findUnique({ where: { id }, include: { resort: true, rooms: true, amenities: { include: { amenity: true } } } });
  if (!l || (l.ownerId !== u.id && !isStaff(u.role))) return { error: "Нет доступа" };
  const { aiEnabled, complete } = await import("./ai");
  if (!(await aiEnabled())) return { error: "Помощник пока не подключён" };
  const s = await getSettings();
  if (!(await limit("ai", Number(s.aiDailyLimit) || 10, 86400, u.id))) return { error: "Лимит на сегодня исчерпан, попробуйте завтра" };
  const facts = [
    `Тип: ${LISTING_TYPES[l.type] ?? l.type}`,
    `Курорт: ${l.resort.name}`,
    l.address && `Адрес: ${l.address}`,
    l.seaDistance && `До моря: ${l.seaDistance} м`,
    l.beachType && `Пляж: ${BEACH_TYPES[l.beachType] ?? l.beachType}`,
    `Гостей максимум: ${l.maxGuests}`,
    l.rooms.length && `Номера: ${l.rooms.map(r => `${r.name} (до ${r.guests} гостей)`).join("; ")}`,
    l.amenities.length && `Удобства: ${l.amenities.map(a => a.amenity.name).join(", ")}`,
    `Дети: ${l.childrenAllowed ? "можно" : "нельзя"}; животные: ${l.petsAllowed ? "можно" : "нельзя"}`,
    `Заезд после ${l.checkInTime}, выезд до ${l.checkOutTime}`,
  ].filter(Boolean).join("\n");
  const sys = "Ты помогаешь хозяевам гостевых домов и квартир у моря написать описание объявления для сайта аренды жилья. " +
    "Пиши по-русски, от лица хозяина («у нас», «мы»), простыми словами, без рекламных штампов, превосходных степеней и восклицательных знаков. " +
    "Объём 600–1000 знаков, 2–4 коротких абзаца без заголовков и списков. Опирайся только на данные и заметки хозяина, не выдумывай фактов. " +
    "Не пиши телефоны, ссылки, цены и название сайта.";
  const prompt = `Данные объекта «${l.title}»:\n${facts}\n\nЗаметки хозяина (могут быть пустыми или неряшливыми):\n${notes.slice(0, 3000) || "—"}\n\nНапиши описание.`;
  try {
    const text = await complete(sys, prompt);
    await audit(u.id, "ai_describe", "Listing", id);
    return { text: text.replace(/^["«]|["»]$/g, "").trim() };
  } catch (e) { return { error: (e as Error).message }; }
}

// ---------- Перенос по ссылке ----------
const PRIVATE = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^::1$/, /^f[cd]/i, /^fe80/i, /^::ffff:(10|127|192\.168|169\.254)\./i];
async function safeUrl(raw: string) {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("Это не похоже на ссылку"); }
  if (!/^https?:$/.test(u.protocol)) throw new Error("Нужна ссылка вида https://…");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map(a => a.address);
  if (!addrs.length) throw new Error("Сайт не найден");
  if (addrs.some(a => PRIVATE.some(re => re.test(a)))) throw new Error("Эта ссылка недоступна");
  return u;
}
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
async function get(raw: string, max: number, accept: string) {
  let url = raw;
  for (let i = 0; i < 4; i++) {
    const u = await safeUrl(url);
    const res = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(15000), headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "ru-RU,ru;q=0.9" } })
      .catch(() => { throw new Error("Сайт не ответил. Попробуйте позже или перенесите текст и фото вручную"); });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) { url = new URL(res.headers.get("location")!, u).toString(); continue; }
    if (!res.ok) throw new Error(`Сайт не отдал страницу (${res.status}). Часть сайтов закрыта от автоматического чтения — перенесите текст и фото вручную`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > max) throw new Error("Слишком большая страница");
    return { buf, type: res.headers.get("content-type") ?? "", url: u.toString() };
  }
  throw new Error("Слишком много перенаправлений");
}
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&laquo;/g, "«").replace(/&raquo;/g, "»").replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");
const metaAll = (html: string, names: string[]) => {
  const out: string[] = [];
  for (const m of html.matchAll(/<meta\s[^>]*>/gi)) {
    const tag = m[0];
    const key = tag.match(/(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const val = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (key && val && names.includes(key)) out.push(decode(val).trim());
  }
  return out;
};
function parsePage(html: string, base: string) {
  const ld: { name?: string; description?: string; images: string[] } = { images: [] };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o: unknown): void => {
        if (Array.isArray(o)) return o.forEach(walk);
        if (!o || typeof o !== "object") return;
        const r = o as Record<string, unknown>;
        if (typeof r.name === "string" && !ld.name) ld.name = r.name;
        if (typeof r.description === "string" && (!ld.description || r.description.length > ld.description.length)) ld.description = r.description;
        const img = r.image ?? r.photo;
        for (const x of Array.isArray(img) ? img : img ? [img] : []) {
          const src = typeof x === "string" ? x : (x as Record<string, unknown>)?.url ?? (x as Record<string, unknown>)?.contentUrl;
          if (typeof src === "string") ld.images.push(src);
        }
        Object.values(r).forEach(v => typeof v === "object" && walk(v));
      };
      walk(JSON.parse(m[1].trim()));
    } catch { /* битый JSON-LD пропускаем */ }
  }
  const title = ld.name || metaAll(html, ["og:title", "twitter:title"])[0] || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const description = [ld.description, ...metaAll(html, ["og:description", "description", "twitter:description"])].filter(Boolean).sort((a, b) => b!.length - a!.length)[0] ?? "";
  // Текст со страницы: самый длинный блок описания или абзац, если в метатегах только короткая выжимка
  const strip = (h: string) => decode(h.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
  const body = html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, "");
  const blocks = [...body.matchAll(/<(div|section|p)[^>]*(?:class|id)="[^"]*(?:descr|about|text)[^"]*"[^>]*>([\s\S]{200,20000}?)<\/\1>/gi), ...body.matchAll(/<p[^>]*>([\s\S]{150,5000}?)<\/p>/gi)]
    .map(m => strip(m[m.length - 1])).filter(t => t.length >= 200 && !/cookie|©/i.test(t.slice(0, 80)));
  const longText = (blocks.sort((a, b) => b.length - a.length)[0] ?? "").replace(/^(Описание|О доме|Об объекте)\s+/i, "");
  // Фото: из разметки страницы, мелкие картинки отсеются при загрузке (минимум 400×300)
  const pageImgs = [...body.matchAll(/<img[^>]+(?:data-src|src)="([^"]+\.(?:jpe?g|webp|png)(?:\?[^"]*)?)"/gi)].map(m => m[1]).filter(src => !/logo|icon|sprite|avatar|banner|placeholder/i.test(src));
  const images = [...ld.images, ...metaAll(html, ["og:image", "og:image:url", "twitter:image"]), ...pageImgs]
    .map(src => { try { return new URL(src, base).toString(); } catch { return ""; } })
    .filter(src => /^https?:/.test(src));
  return {
    title: title.replace(/\s*[|—–-]\s*(Авито|Avito|Суточно\.ру|Sutochno|Яндекс Путешествия|ЦИАН|Островок).*$/i, "").replace(/\s+/g, " ").trim().slice(0, 120),
    description: (description.length < 300 && longText.length > description.length ? longText : description).replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 8000),
    images: [...new Set(images)].slice(0, 30),
  };
}

export async function importListing(_: unknown, fd: FormData): Promise<FormState> {
  const u = await requireUser("/cabinet/new");
  const url = String(fd.get("url") ?? "").trim(), resortSlug = String(fd.get("resort") ?? ""), type = String(fd.get("type") ?? "GUESTHOUSE");
  if (!url) return { error: "Вставьте ссылку на объявление" };
  const resort = await db.resort.findUnique({ where: { slug: resortSlug } });
  if (!resort) return { error: "Выберите курорт из списка" };
  if (!(await limit("import", 10, 3600, u.id))) return { error: TOO_MANY };
  const plan = await ownerPlan(u.id);
  const count = await db.listing.count({ where: { ownerId: u.id, status: { not: "ARCHIVED" } } });
  if (!isStaff(u.role) && count >= plan.maxListings) return { error: `На тарифе «${plan.name}» можно до ${plan.maxListings} объявлений` };
  let page;
  try {
    const { buf, url: finalUrl } = await get(url, 4_000_000, "text/html,application/xhtml+xml");
    page = parsePage(buf.toString("utf8"), finalUrl);
  } catch (e) { return { error: (e as Error).message }; }
  if (!page.title && !page.description) return { error: "На странице не нашлось описания. Перенесите текст и фото вручную" };
  const title = page.title.length >= 3 ? page.title : "Новый объект";
  const l = await db.listing.create({ data: {
    ownerId: u.id, resortId: resort.id, type: (type in LISTING_TYPES ? type : "GUESTHOUSE") as never, title, slug: `${slugify(title)}-${Date.now().toString(36)}`,
    description: page.description, contactPhone: u.phone ?? "", contactName: u.name,
  }});
  if (u.role === "GUEST") await db.user.update({ where: { id: u.id }, data: { role: "OWNER" } });
  let saved = 0;
  for (const src of page.images.slice(0, Math.min(15, plan.maxPhotos))) {
    try {
      const { buf, type: ct } = await get(src, 15 * 1024 * 1024, "image/avif,image/webp,image/*");
      if (!/^image\//.test(ct)) continue;
      const file = new File([new Uint8Array(buf)], `import-${saved}.jpg`, { type: ct });
      await db.listingPhoto.create({ data: { listingId: l.id, url: await saveImage(file), sort: saved } });
      saved++;
    } catch { /* фото, которое не скачалось, пропускаем */ }
  }
  await audit(u.id, "import", "Listing", l.id, { url, photos: saved });
  redirect(`/cabinet/listings/${l.id}?imported=${saved}`);
}
