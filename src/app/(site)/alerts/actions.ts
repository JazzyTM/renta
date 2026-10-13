"use server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isBot, limit, TOO_MANY } from "@/lib/guard";
import { alertQuery } from "@/lib/alerts";
import type { FormState } from "@/lib/form";

// Подписка на новые объявления по текущему поиску
export async function createAlert(_: unknown, fd: FormData): Promise<FormState> {
  if (isBot(fd)) return { ok: "Готово" };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Проверьте адрес почты" };
  if (!(await limit("alert", 10, 3600, email))) return { error: TOO_MANY };
  const u = new URL(String(fd.get("path") ?? "/search"), "http://x");
  for (const k of ["ci", "co", "page", "sort", "adults", "children"]) u.searchParams.delete(k);
  const path = u.pathname + u.search;
  const q = await alertQuery(path);
  if (!q.base) return { error: "Такой страницы поиска нет" };
  if (await db.searchAlert.count({ where: { email, isActive: true } }) >= 20) return { error: "У вас уже 20 подписок. Отключите старые по ссылке из письма" };
  const user = await getUser();
  const title = String(fd.get("title") ?? "").slice(0, 150);
  const m = path.match(/^\/kurort\/([^/?]+)/);
  const resort = m ? await db.resort.findUnique({ where: { slug: m[1] }, select: { id: true } }) : null;
  const same = await db.searchAlert.findFirst({ where: { email, query: path, isActive: true } });
  if (!same) await db.searchAlert.create({ data: { email, userId: user?.id, resortId: resort?.id, query: path, title, token: randomBytes(16).toString("base64url") } });
  return { ok: "Подписка оформлена. Новые варианты придут на почту раз в день" };
}
