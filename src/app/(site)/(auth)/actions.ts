"use server";
import { hasConsent, NO_CONSENT } from "@/components/Consent";
import type { FormState } from "@/lib/form";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkPassword, consumeToken, createSession, createToken, hashPassword, destroySession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { sendTemplate, mailEnabled } from "@/lib/mail";
import { createHash, randomInt } from "crypto";
import { audit } from "@/lib/audit";
import { limit, isBot, TOO_MANY } from "@/lib/guard";

const failed = new Map<string, number[]>();
const isStaffRole = (r: string) => r === "ADMIN" || r === "MODERATOR";

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function login(_: unknown, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") || "").trim().toLowerCase(), password = String(fd.get("password") || "");
  if (!(await limit("login", 20, 900))) return { error: TOO_MANY };
  // Не больше 8 неверных паролей к одной почте за 15 минут
  if ((failed.get(email) ?? []).filter(t => t > Date.now() - 900_000).length >= 8) return { error: "Слишком много неверных попыток для этой почты. Подождите 15 минут или восстановите пароль" };
  const u = await db.user.findUnique({ where: { email } });
  if (!u?.passwordHash || !(await checkPassword(password, u.passwordHash))) {
    failed.set(email, [...(failed.get(email) ?? []).filter(t => t > Date.now() - 900_000), Date.now()]);
    if (u && isStaffRole(u.role)) await audit(u.id, "login-failed", "User", u.id);
    return { error: "Неверная почта или пароль" };
  }
  failed.delete(email);
  if (u.status === "BLOCKED") return { error: "Аккаунт заблокирован" + (u.blockReason ? `: ${u.blockReason}` : "") };
  const s = await getSettings();
  if (s.requireEmailVerify && !u.emailVerified) return { error: "Подтвердите почту: ссылка в письме после регистрации", resend: email };
  await createSession(u.id);
  const next = safeNext(fd.get("next"));
  redirect(next !== "/" ? next : isStaffRole(u.role) ? "/admin" : u.role === "OWNER" ? "/cabinet" : "/");
}

const Reg = z.object({
  name: z.string().trim().min(2, "Напишите имя").max(60),
  email: z.string().trim().toLowerCase().email("Проверьте почту"),
  password: z.string().min(8, "Пароль не короче 8 символов").max(100),
});

export async function register(_: unknown, fd: FormData): Promise<FormState> {
  const s = await getSettings();
  if (!s.registrationOpen) return { error: "Регистрация временно закрыта" };
  if (isBot(fd)) return { ok: "Мы отправили письмо со ссылкой для подтверждения почты" };
  if (!hasConsent(fd)) return { error: NO_CONSENT };
  if (!(await limit("register", 5, 3600))) return { error: TOO_MANY };
  const p = Reg.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  if (await db.user.findUnique({ where: { email: p.data.email } })) return { error: "Эта почта уже зарегистрирована. Войдите или восстановите пароль" };
  const u = await db.user.create({ data: { email: p.data.email, name: p.data.name, passwordHash: await hashPassword(p.data.password), role: fd.get("owner") ? "OWNER" : "GUEST" } });
  await audit(u.id, "register", "User", u.id);
  if (u.role === "OWNER") await (await import("@/lib/notify")).notifyAdmin("Новый хозяин", `${u.name}, ${u.email}`, `/admin/users/${u.id}`).catch(() => {});
  await (await import("@/lib/referral")).attachReferrer(u.id, (await (await import("next/headers")).cookies()).get("ref")?.value);
  if (s.requireEmailVerify) {
    await sendVerify(u.id, u.email!, u.name);
    return { ok: "Мы отправили письмо со ссылкой для подтверждения почты" };
  }
  await createSession(u.id);
  const next = safeNext(fd.get("next"));
  redirect(next !== "/" ? next : u.role === "OWNER" ? "/cabinet" : "/");
}

async function sendVerify(userId: string, email: string, name: string) {
  const t = await createToken(userId, "EMAIL_VERIFY", 72);
  await sendTemplate(email, "verify_email", { name, link: `${process.env.APP_URL}/verify?t=${t}` });
}

export async function resendVerify(email: string) {
  if (!(await limit("resend", 5, 3600, email))) return { ok: true };
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
  if (!(await limit("forgot", 5, 3600, email))) return { error: TOO_MANY };
  const u = await db.user.findUnique({ where: { email } });
  if (u) { const t = await createToken(u.id, "PASSWORD_RESET", 2); await sendTemplate(email, "password_reset", { link: `${process.env.APP_URL}/reset?t=${t}` }); }
  return { ok: "Если такая почта есть, мы отправили на неё ссылку" };
}

export async function reset(_: unknown, fd: FormData): Promise<FormState> {
  const pw = String(fd.get("password") || "");
  if (!(await limit("reset", 10, 3600))) return { error: TOO_MANY };
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

// ---------- Вход по коду из письма (без пароля; новая почта — новый аккаунт) ----------
const CODE_MIN = 15;
const codeHash = (email: string, code: string) => createHash("sha256").update(`${email}:${code}:${process.env.AUTH_SECRET ?? ""}`).digest("hex");
const Email = z.string().trim().toLowerCase().email("Проверьте почту");

export async function sendLoginCode(_: unknown, fd: FormData): Promise<FormState> {
  if (!(await mailEnabled())) return { error: "Вход по коду пока недоступен, войдите по паролю" };
  if (isBot(fd)) return { ok: "sent" };
  const p = Email.safeParse(fd.get("email"));
  if (!p.success) return { error: p.error.issues[0].message };
  const email = p.data;
  if (!(await limit("code", 10, 3600)) || !(await limit("code-mail", 5, 3600, email))) return { error: TOO_MANY };
  const u = await db.user.findUnique({ where: { email } });
  if (u?.status === "BLOCKED") return { error: "Аккаунт заблокирован" };
  if (!u && !(await getSettings()).registrationOpen) return { error: "Регистрация временно закрыта" };
  const code = String(randomInt(100000, 1000000));
  await db.loginCode.updateMany({ where: { email, usedAt: null }, data: { usedAt: new Date() } });
  await db.loginCode.create({ data: { email, codeHash: codeHash(email, code), expiresAt: new Date(Date.now() + CODE_MIN * 60000) } });
  await sendTemplate(email, "login_code", { code });
  return { ok: "sent" };
}

export async function verifyLoginCode(_: unknown, fd: FormData): Promise<FormState> {
  const p = Email.safeParse(fd.get("email"));
  const code = String(fd.get("code") ?? "").replace(/\D/g, "");
  if (!p.success || code.length !== 6) return { error: "Введите 6 цифр из письма" };
  const email = p.data;
  const row = await db.loginCode.findFirst({ where: { email, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!row) return { error: "Код устарел. Запросите новый" };
  if (row.attempts >= 5) return { error: "Слишком много попыток. Запросите новый код" };
  if (row.codeHash !== codeHash(email, code)) {
    await db.loginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { error: "Неверный код" };
  }
  let u = await db.user.findUnique({ where: { email } });
  if (u?.status === "BLOCKED") return { error: "Аккаунт заблокирован" };
  if (!u && !hasConsent(fd)) return { error: "Вы у нас впервые: " + NO_CONSENT.toLowerCase() };
  await db.loginCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  if (!u) {
    u = await db.user.create({ data: { email, name: email.split("@")[0].slice(0, 60), emailVerified: new Date() } });
    await audit(u.id, "register_code", "User", u.id);
    await (await import("@/lib/referral")).attachReferrer(u.id, (await (await import("next/headers")).cookies()).get("ref")?.value);
  } else if (!u.emailVerified) await db.user.update({ where: { id: u.id }, data: { emailVerified: new Date() } });
  await createSession(u.id);
  const next = safeNext(fd.get("next"));
  redirect(next !== "/" ? next : isStaffRole(u.role) ? "/admin" : u.role === "OWNER" ? "/cabinet" : "/");
}

