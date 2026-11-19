// Скачивает стоковые фото Unsplash на свой сервер (/uploads/stock/{id}.webp + миниатюра -t.webp)
// и переписывает ссылки в базе на свои. Повторный запуск безопасен: скачанное пропускается.
// Запуск: npm run stock:download
import "dotenv/config";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { STOCK, RESORT_COVERS, DEMO_EXTERIOR, DEMO_ROOMS, DEMO_VIEWS, stockLocal } from "../src/lib/stock";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const DIR = join(process.env.UPLOAD_DIR || "./uploads", "stock");
const RE = /https:\/\/images\.unsplash\.com\/photo-([\w-]+?)\?[^"\s)]*/g;
const idsIn = (s: string | null | undefined) => [...(s ?? "").matchAll(RE)].map(m => m[1]);

async function download(id: string) {
  const file = join(DIR, `${id}.webp`);
  if (existsSync(file) && existsSync(join(DIR, `${id}-t.webp`))) return "skip";
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://images.unsplash.com/photo-${id}?w=1920&q=82&fm=jpg`, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const big = await sharp(buf).rotate().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      await writeFile(file, big);
      await writeFile(join(DIR, `${id}-t.webp`), await sharp(big).resize({ width: 640, height: 640, fit: "inside" }).webp({ quality: 74 }).toBuffer());
      return "ok";
    } catch (e) { if (i === 2) return `ошибка: ${(e as Error).message}`; }
  }
  return "ошибка";
}

async function main() {
  await mkdir(DIR, { recursive: true });
  const [photos, resorts, articles, settings] = await Promise.all([
    db.listingPhoto.findMany({ where: { url: { contains: "images.unsplash.com" } }, select: { id: true, url: true } }),
    db.resort.findMany({ where: { coverUrl: { contains: "images.unsplash.com" } }, select: { id: true, coverUrl: true } }),
    db.article.findMany({ where: { coverUrl: { contains: "images.unsplash.com" } }, select: { id: true, coverUrl: true } }),
    db.setting.findMany(),
  ]);
  const ids = new Set<string>([...Object.values(STOCK), ...Object.values(RESORT_COVERS), ...DEMO_EXTERIOR, ...DEMO_ROOMS, ...DEMO_VIEWS]);
  for (const x of [...photos.map(p => p.url), ...resorts.map(r => r.coverUrl), ...articles.map(a => a.coverUrl), ...settings.map(s => JSON.stringify(s.value))]) idsIn(x).forEach(i => ids.add(i));

  const failed = new Set<string>();
  let ok = 0, skip = 0;
  for (const id of ids) {
    const r = await download(id);
    if (r === "ok") ok++; else if (r === "skip") skip++; else { failed.add(id); console.log(`  ${id}: ${r}`); }
  }
  console.log(`Фото: скачано ${ok}, уже были ${skip}, не скачались ${failed.size}`);

  // Ссылки в базе → свои (только для скачанных)
  const local = (url: string) => url.replace(RE, (m, id: string) => (failed.has(id) ? m : stockLocal(id)));
  let n = 0;
  for (const p of photos) { const u = local(p.url); if (u !== p.url) { await db.listingPhoto.update({ where: { id: p.id }, data: { url: u } }); n++; } }
  for (const r of resorts) { const u = local(r.coverUrl!); if (u !== r.coverUrl) { await db.resort.update({ where: { id: r.id }, data: { coverUrl: u } }); n++; } }
  for (const a of articles) { const u = local(a.coverUrl!); if (u !== a.coverUrl) { await db.article.update({ where: { id: a.id }, data: { coverUrl: u } }); n++; } }
  for (const s of settings) { const v = JSON.stringify(s.value), u = local(v); if (u !== v) { await db.setting.update({ where: { key: s.key }, data: { value: JSON.parse(u) } }); n++; } }
  console.log(`Ссылок в базе заменено: ${n}`);
}

main().finally(() => db.$disconnect());
