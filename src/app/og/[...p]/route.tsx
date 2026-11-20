// Картинки-превью для соцсетей и мессенджеров (1200×630 PNG): фото, логотип, заголовок, цена.
// /og/home · /og/l/{номер} · /og/r/{курорт} · /og/g/{регион} · /og/a/{статья}
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { visibleWhere } from "@/lib/queries";
import { prepOf } from "@/lib/collections";
import { regionAll, regionLabel } from "@/lib/regions";
import { LISTING_TYPES } from "@/lib/labels";
import { plural } from "@/lib/format";
import { UPLOAD_DIR } from "@/lib/upload";

const W = 1200, H = 630;
const FONT_DIR = "/usr/share/fonts/truetype/dejavu";
const font = (f: string) => existsSync(join(FONT_DIR, f)) ? readFile(join(FONT_DIR, f)) : null;
const fontsP = Promise.all([font("DejaVuSans-Bold.ttf"), font("DejaVuSans.ttf")]);

// Фото со своего сервера → JPEG нужного размера (Satori не понимает webp)
async function photo(url?: string | null) {
  if (!url) return null;
  try {
    const buf = url.startsWith("/uploads/") ? await readFile(join(UPLOAD_DIR, url.slice(9))) : url.startsWith("http") ? Buffer.from(await (await fetch(url, { signal: AbortSignal.timeout(8000) })).arrayBuffer()) : null;
    if (!buf) return null;
    const jpg = await sharp(buf).resize(W, H, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch { return null; }
}

type Card = { img: string | null; badge?: string; title: string; sub?: string; price?: string };

async function data(kind: string, id: string): Promise<Card | null> {
  const s = await getSettings();
  if (kind === "l") {
    const l = await db.listing.findFirst({ where: { AND: [await visibleWhere(), { number: Number(id) || -1 }] }, include: { resort: true, photos: { take: 1, orderBy: { sort: "asc" } } } });
    if (!l) return null;
    return { img: await photo(l.photos[0]?.url), badge: l.resort.name, title: l.title,
      sub: [LISTING_TYPES[l.type], l.seaDistance != null ? `${l.seaDistance} м до моря` : "", l.ratingCount ? `★ ${(l.ratingAvg * 2).toFixed(1)}` : ""].filter(Boolean).join(" · "),
      price: l.priceFrom ? `от ${l.priceFrom.toLocaleString("ru-RU")} ₽ за ночь` : undefined };
  }
  if (kind === "r") {
    const r = await db.resort.findUnique({ where: { slug: id }, include: { region: true } });
    if (!r) return null;
    const n = await db.listing.count({ where: { AND: [await visibleWhere(), { resortId: r.id }] } });
    return { img: await photo(r.coverUrl ?? s.heroImage), badge: r.region.name !== r.name ? regionLabel(r.region.name) : undefined, title: `Жильё ${prepOf(r)}`, sub: n ? `${n} ${plural(n, ["вариант", "варианта", "вариантов"])} у моря, без посредников` : "Жильё у моря без посредников" };
  }
  if (kind === "g") {
    const g = await db.region.findUnique({ where: { slug: id }, include: { resorts: { where: { isActive: true }, select: { id: true, coverUrl: true } } } });
    if (!g) return null;
    const n = await db.listing.count({ where: { AND: [await visibleWhere(), { resort: { regionId: g.id } }] } });
    return { img: await photo(g.resorts.find(r => r.coverUrl)?.coverUrl ?? s.heroImage), badge: `${g.resorts.length} ${plural(g.resorts.length, ["курорт", "курорта", "курортов"])}`, title: `${regionAll(g.name)}: жильё у моря`, sub: n ? `${n} ${plural(n, ["вариант", "варианта", "вариантов"])} без посредников` : undefined };
  }
  if (kind === "a") {
    const a = await db.article.findUnique({ where: { slug: id } });
    if (!a) return null;
    return { img: await photo(a.coverUrl ?? s.heroImage), badge: "Статья", title: a.title, sub: a.excerpt ?? undefined };
  }
  return { img: await photo(String(s.heroImage || "")), title: "Жильё у моря без посредников", sub: "Гостевые дома, квартиры и номера на Чёрном и Азовском море. Звоните и пишите хозяевам напрямую" };
}

// Готовые картинки храним 6 часов: соцсети запрашивают превью много раз
const CACHE = join(process.env.STATE_DIR || "/tmp", "og-cache");
const HEADERS = { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=21600, stale-while-revalidate=604800" };

export async function GET(_: Request, { params }: { params: Promise<{ p: string[] }> }) {
  const [kind = "home", id = ""] = (await params).p;
  const file = join(CACHE, `${kind}-${id.replace(/[^\w-]/g, "_").slice(0, 120)}.jpg`);
  try { if (Date.now() - statSync(file).mtimeMs < 6 * 3600_000) return new Response(new Uint8Array(await readFile(file)), { headers: HEADERS }); } catch {}
  const png = await render(kind, id);
  // JPEG ~150 КБ вместо PNG ~1,5 МБ: WhatsApp не показывает тяжёлые превью
  const jpg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  mkdir(CACHE, { recursive: true }).then(() => writeFile(file, jpg)).catch(() => {});
  return new Response(new Uint8Array(jpg), { headers: HEADERS });
}

async function render(kind: string, id: string) {
  const c = await data(kind, decodeURIComponent(id)) ?? await data("home", "");
  const s = await getSettings();
  const [bold, regular] = await fontsP;
  const fonts = [bold && { name: "DejaVu", data: bold, weight: 700 as const, style: "normal" as const }, regular && { name: "DejaVu", data: regular, weight: 400 as const, style: "normal" as const }].filter(Boolean) as { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[];
  const title = c!.title.length > 70 ? c!.title.slice(0, 68) + "…" : c!.title;
  const sub = c!.sub && c!.sub.length > 110 ? c!.sub.slice(0, 108) + "…" : c!.sub;
  return new ImageResponse(
    <div style={{ width: W, height: H, display: "flex", position: "relative", fontFamily: "DejaVu", background: "#0E4A63" }}>
      {c!.img && <img src={c!.img} width={W} height={H} style={{ position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" }} />}
      <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex", background: "linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,.25) 50%, rgba(0,0,0,.82) 100%)" }} />
      <div style={{ position: "absolute", top: 44, left: 56, display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="60" height="60" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#F2543D" /><path d="M9.5 17a6.5 6.5 0 0 1 13 0z" fill="#fff" /><path d="M5 21.2c2.75 0 2.75-1.7 5.5-1.7s2.75 1.7 5.5 1.7 2.75-1.7 5.5-1.7 2.75 1.7 5.5 1.7M8 25.6c2 0 2-1.3 4-1.3s2 1.3 4 1.3 2-1.3 4-1.3 2 1.3 4 1.3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 40, fontWeight: 700, color: "#fff", letterSpacing: -1 }}>{String(s.siteName).toLowerCase()}</span>
      </div>
      <div style={{ position: "absolute", left: 56, right: 56, bottom: 48, display: "flex", flexDirection: "column", gap: 14 }}>
        {c!.badge && <div style={{ display: "flex" }}><span style={{ fontSize: 26, color: "#fff", background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.35)", borderRadius: 999, padding: "6px 20px" }}>{c!.badge}</span></div>}
        <div style={{ fontSize: title.length > 40 ? 54 : 64, fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: -1 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          {sub ? <span style={{ fontSize: 28, color: "rgba(255,255,255,.9)", lineHeight: 1.3, maxWidth: c!.price ? 640 : 1080 }}>{sub}</span> : <span />}
          {c!.price && <span style={{ fontSize: 34, fontWeight: 700, color: "#fff", background: "#F2543D", borderRadius: 16, padding: "12px 26px", whiteSpace: "nowrap" }}>{c!.price}</span>}
        </div>
      </div>
    </div>,
    { width: W, height: H, fonts },
  );
}
