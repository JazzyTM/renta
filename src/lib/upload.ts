import "server-only";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join, resolve } from "path";
import { randomBytes } from "crypto";

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || "./uploads");
const OK = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX = 12 * 1024 * 1024;

export async function saveImage(file: File) {
  if (!OK.has(file.type)) throw new Error("Нужны фото в формате JPG, PNG или WebP");
  if (file.size > MAX) throw new Error("Фото больше 12 МБ");
  const buf = Buffer.from(await file.arrayBuffer());
  // Тип определяем по первым байтам файла, а не по тому, что прислал браузер
  const ext = sniff(buf);
  if (!ext) throw new Error("Файл не похож на фото. Нужен JPG, PNG или WebP");
  const ym = new Date().toISOString().slice(0, 7);
  const dir = join(UPLOAD_DIR, ym);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(10).toString("hex")}.${ext}`;
  await writeFile(join(dir, name), buf);
  return `/uploads/${ym}/${name}`;
}

function sniff(b: Buffer) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export async function removeImage(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const p = resolve(UPLOAD_DIR, url.slice("/uploads/".length));
  if (p.startsWith(UPLOAD_DIR)) await unlink(p).catch(() => {});
}
