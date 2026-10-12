import "server-only";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join, resolve } from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { getSettings } from "./settings";
import { thumb } from "./img";

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || "./uploads");
const MAX = 15 * 1024 * 1024;

function sniff(b: Buffer) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (b.length > 12 && b.toString("ascii", 4, 8) === "ftyp" && /heic|heix|mif1|msf1/.test(b.toString("ascii", 8, 12))) return "heic";
  return null;
}

const esc = (s: string) => s.replace(/[<>&"']/g, c => `&#${c.charCodeAt(0)};`);

// Водяной знак: текст в правом нижнем углу, размер от ширины фото
function watermarkSvg(w: number, h: number, text: string, opacity: number) {
  const size = Math.max(14, Math.round(w / 28));
  const pad = Math.round(size * 0.8);
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <text x="${w - pad}" y="${h - pad}" text-anchor="end" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="${size}"
      fill="#fff" fill-opacity="${opacity}" stroke="#000" stroke-opacity="${opacity * 0.35}" stroke-width="${Math.max(1, size / 18)}">${esc(text)}</text></svg>`);
}

// Сжимает фото: поворот по EXIF, удаление метаданных (в том числе GPS), уменьшение, WebP, копия для карточек, водяной знак
export async function saveImage(file: File) {
  if (file.size > MAX) throw new Error("Фото больше 15 МБ");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniff(buf)) throw new Error("Файл не похож на фото. Нужен JPG, PNG, WebP или HEIC");
  const s = await getSettings();
  const maxW = Number(s.photoMaxSize) || 2000, q = Number(s.photoQuality) || 82;
  let img = sharp(buf, { failOn: "error" }).rotate().resize({ width: maxW, height: maxW, fit: "inside", withoutEnlargement: true });
  const { data: base, info } = await img.toBuffer({ resolveWithObject: true });
  if (info.width < 400 || info.height < 300) throw new Error("Фото слишком маленькое, нужно хотя бы 400×300");
  let full = sharp(base);
  if (s.watermark && String(s.watermarkText || s.siteName).trim())
    full = full.composite([{ input: watermarkSvg(info.width, info.height, String(s.watermarkText || s.siteName), Number(s.watermarkOpacity) / 100 || 0.5), top: 0, left: 0 }]);
  const ym = new Date().toISOString().slice(0, 7);
  const dir = join(UPLOAD_DIR, ym);
  await mkdir(dir, { recursive: true });
  const name = randomBytes(10).toString("hex");
  const out = await full.webp({ quality: q }).toBuffer();
  await writeFile(join(dir, `${name}.webp`), out);
  await writeFile(join(dir, `${name}-t.webp`), await sharp(out).resize({ width: 640, height: 640, fit: "inside" }).webp({ quality: 76 }).toBuffer());
  return `/uploads/${ym}/${name}.webp`;
}

export async function removeImage(url: string) {
  if (!url.startsWith("/uploads/")) return;
  for (const u of new Set([url, thumb(url)])) {
    const p = resolve(UPLOAD_DIR, u.slice("/uploads/".length));
    if (p.startsWith(UPLOAD_DIR)) await unlink(p).catch(() => {});
  }
}
