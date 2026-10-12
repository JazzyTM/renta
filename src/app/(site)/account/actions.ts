"use server";
import type { FormState } from "@/lib/form";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, hashPassword, checkPassword } from "@/lib/auth";

export async function saveProfile(_: unknown, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const name = String(fd.get("name") || "").trim().slice(0, 60), phone = String(fd.get("phone") || "").trim().slice(0, 30);
  if (name.length < 2) return { error: "Напишите имя" };
  await db.user.update({ where: { id: u.id }, data: { name, phone } });
  revalidatePath("/account");
  return { ok: "Сохранено" };
}

export async function changePassword(_: unknown, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const cur = String(fd.get("current") || ""), next = String(fd.get("next") || "");
  if (u.passwordHash && !(await checkPassword(cur, u.passwordHash))) return { error: "Текущий пароль неверный" };
  if (next.length < 8) return { error: "Новый пароль не короче 8 символов" };
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Пароль изменён" };
}
