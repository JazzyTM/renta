"use server";
// Быстрый старт хозяина: объект и контакты одной формой, аккаунт создаётся сам
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "./db";
import { createSession, getUser, hashPassword } from "./auth";
import { getSettings } from "./settings";
import { slugify } from "./slug";
import { audit } from "./audit";
import { limit, isBot, TOO_MANY } from "./guard";
import { phoneIntl } from "./contacts";
import { LISTING_TYPES } from "./labels";
import { hasConsent, NO_CONSENT } from "@/components/Consent";
import type { FormState } from "./form";

const Start = z.object({
  title: z.string().trim().min(3, "Напишите название объекта").max(120),
  type: z.string(),
  resort: z.string().min(1, "Выберите курорт"),
  name: z.string().trim().min(2, "Напишите, как к вам обращаться").max(60),
  phone: z.string().trim().max(30),
  email: z.string().trim().toLowerCase().email("Проверьте почту"),
  password: z.string().min(8, "Пароль не короче 8 символов").max(100),
});

export async function startListing(_: unknown, fd: FormData): Promise<FormState> {
  if (await getUser()) redirect("/cabinet/new");
  const s = await getSettings();
  if (!s.registrationOpen) return { error: "Регистрация временно закрыта" };
  if (isBot(fd)) return { error: "Не получилось отправить" };
  const p = Start.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const v = p.data;
  if (!(v.type in LISTING_TYPES)) return { error: "Выберите тип жилья" };
  const phone = phoneIntl(v.phone);
  if (phone.length < 11 || phone.length > 13) return { error: "Проверьте телефон: гости будут звонить на него" };
  if (!hasConsent(fd)) return { error: NO_CONSENT };
  if (!(await limit("register", 5, 3600))) return { error: TOO_MANY };
  const resort = await db.resort.findUnique({ where: { slug: v.resort } });
  if (!resort) return { error: "Выберите курорт из списка" };
  if (await db.user.findUnique({ where: { email: v.email } })) return { error: "Эта почта уже зарегистрирована. Войдите по ссылке ниже и добавьте объект из кабинета" };
  const pretty = `+${phone[0]} ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`;
  const u = await db.user.create({ data: { email: v.email, name: v.name, phone: pretty, role: "OWNER", passwordHash: await hashPassword(v.password) } });
  const l = await db.listing.create({ data: {
    ownerId: u.id, resortId: resort.id, type: v.type as any, title: v.title, slug: `${slugify(v.title)}-${Date.now().toString(36)}`,
    contactPhone: pretty, contactName: v.name,
  }});
  await audit(u.id, "register", "User", u.id);
  await audit(u.id, "create", "Listing", l.id);
  await (await import("./notify")).notifyAdmin("Новый хозяин", `${u.name}, ${u.email}, ${pretty}`, `/admin/users/${u.id}`).catch(() => {});
  await (await import("./referral")).attachReferrer(u.id, (await cookies()).get("ref")?.value);
  await createSession(u.id);
  redirect(`/cabinet/listings/${l.id}?welcome=1`);
}
