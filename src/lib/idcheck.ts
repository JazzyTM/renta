import "server-only";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { join, resolve, basename } from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { UPLOAD_DIR } from "./upload";

// Фото документов лежат вне публичной папки и удаляются сразу после проверки
export const PRIVATE_DIR = resolve(process.env.PRIVATE_DIR || join(UPLOAD_DIR, "..", "private"));

export async function saveIdDoc(file: File) {
  if (file.size > 15 * 1024 * 1024) throw new Error("Фото больше 15 МБ");
  const buf = Buffer.from(await file.arrayBuffer());
  const img = sharp(buf, { failOn: "error" });
  const meta = await img.metadata().catch(() => null);
  if (!meta?.format || !["jpeg", "png", "webp", "heif"].includes(meta.format)) throw new Error("Нужно фото: JPG, PNG, WebP или HEIC");
  if ((meta.width ?? 0) < 600 || (meta.height ?? 0) < 400) throw new Error("Фото слишком маленькое, данные будет не прочитать");
  await mkdir(PRIVATE_DIR, { recursive: true, mode: 0o700 });
  const name = `id-${randomBytes(12).toString("hex")}.webp`;
  await writeFile(join(PRIVATE_DIR, name), await img.rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer(), { mode: 0o600 });
  return name;
}

const safe = (name: string) => join(PRIVATE_DIR, basename(name));
export const readIdDoc = (name: string) => readFile(safe(name));
export const removeIdDoc = (name?: string | null) => (name ? unlink(safe(name)).catch(() => {}) : Promise.resolve());
