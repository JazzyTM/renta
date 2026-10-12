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
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const ym = new Date().toISOString().slice(0, 7);
  const dir = join(UPLOAD_DIR, ym);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(10).toString("hex")}.${ext}`;
  await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${ym}/${name}`;
}

export async function removeImage(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const p = resolve(UPLOAD_DIR, url.slice("/uploads/".length));
  if (p.startsWith(UPLOAD_DIR)) await unlink(p).catch(() => {});
}
