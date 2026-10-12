"use server";
import type { FormState } from "@/lib/form";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkPassword, consumeToken, createSession, createToken, hashPassword, destroySession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { sendTemplate } from "@/lib/mail";
import { audit } from "@/lib/audit";

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function login(_: unknown, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") || "").trim().toLowerCase(), password = String(fd.get("password") || "");
  const u = await db.user.findUnique({ where: { email } });
  if (!u?.passwordHash || !(await checkPassword(password, u.passwordHash))) return { error: "Неверная почта или пароль" };
  if (u.status === "BLOCKED") return { error: "Аккаунт заблокирован" + (u.blockReason ? `: ${u.blockReason}` : "") };
  const s = await getSettings();
  if (s.requireEmailVerify && !u.emailVerified) return { error: "Подтвердите почту: ссылка в письме после регистрации", resend: email };
  await createSession(u.id);
  redirect(safeNext(fd.get("next")));
}

const Reg = z.object({
  name: z.string().trim().min(2, "Напишите имя").max(60),
  email: z.string().trim().toLowerCase().email("Проверьте почту"),
  password: z.string().min(8, "Пароль не короче 8 символов").max(100),
  agree: z.literal("on", { message: "Нужно согласие с правилами" }),
});

export async function register(_: unknown, fd: FormData): Promise<FormState> {
  const s = await getSettings();
  if (!s.registrationOpen) return { error: "Регистрация временно закрыта" };
  const p = Reg.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  if (await db.user.findUnique({ where: { email: p.data.email } })) return { error: "Эта почта уже зарегистрирована. Войдите или восстановите пароль" };
  const u = await db.user.create({ data: { email: p.data.email, name: p.data.name, passwordHash: await hashPassword(p.data.password), role: fd.get("owner") ? "OWNER" : "GUEST" } });
  await audit(u.id, "register", "User", u.id);
  if (s.requireEmailVerify) {
    await sendVerify(u.id, u.email!, u.name);
    return { ok: "Мы отправили письмо со ссылкой для подтверждения почты" };
  }
  await createSession(u.id);
  redirect(safeNext(fd.get("next")));
}

async function sendVerify(userId: string, email: string, name: string) {
  const t = await createToken(userId, "EMAIL_VERIFY", 72);
  await sendTemplate(email, "verify_email", { name, link: `${process.env.APP_URL}/verify?t=${t}` });
}

export async function resendVerify(email: string) {
  const u = await db.user.findUnique({ where: { email } });
  if (u && !u.emailVerified) await sendVerify(u.id, u.email!, u.name);
  return { ok: true };
}

export async function verifyEmail(t: string) {
  const userId = await consumeToken(t, "EMAIL_VERIFY");
  if (!userId) return false;
  await db.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
  await createSession(userId);
  return true;
}

export async function forgot(_: unknown, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const u = await db.user.findUnique({ where: { email } });
  if (u) { const t = await createToken(u.id, "PASSWORD_RESET", 2); await sendTemplate(email, "password_reset", { link: `${process.env.APP_URL}/reset?t=${t}` }); }
  return { ok: "Если такая почта есть, мы отправили на неё ссылку" };
}

export async function reset(_: unknown, fd: FormData): Promise<FormState> {
  const pw = String(fd.get("password") || "");
  if (pw.length < 8) return { error: "Пароль не короче 8 символов" };
  const userId = await consumeToken(String(fd.get("t") || ""), "PASSWORD_RESET");
  if (!userId) return { error: "Ссылка устарела. Запросите новую" };
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(pw), emailVerified: new Date() } });
  await db.session.deleteMany({ where: { userId } });
  await createSession(userId);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
