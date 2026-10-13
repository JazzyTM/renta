import "server-only";
import nodemailer from "nodemailer";
import { db } from "./db";
import { getSettings } from "./settings";

// Шаблоны по умолчанию. Админ может переопределить их в разделе «Письма».
export const EMAIL_DEFAULTS: Record<string, { subject: string; body: string; vars: string }> = {
  verify_email: { subject: "Подтвердите почту", body: "Здравствуйте, {name}!\n\nЧтобы подтвердить почту, перейдите по ссылке:\n{link}\n\nЕсли вы не регистрировались на {site}, просто удалите это письмо.", vars: "{name} {link} {site}" },
  password_reset: { subject: "Восстановление пароля", body: "Здравствуйте!\n\nЧтобы задать новый пароль, перейдите по ссылке:\n{link}\n\nСсылка действует 2 часа.", vars: "{link} {site}" },
  booking_new_owner: { subject: "Новая заявка на {dates}", body: "{guest} хочет приехать в «{listing}» {dates}, гостей: {guests}.\n\nКомментарий: {comment}\n\nОтветьте гостю: {link}", vars: "{guest} {listing} {dates} {guests} {comment} {link}" },
  booking_accepted_guest: { subject: "Хозяин подтвердил даты", body: "Хозяин «{listing}» подтвердил даты {dates}.\n\nПредоплата: {prepay}. Реквизиты хозяин пришлёт в переписке: {link}", vars: "{listing} {dates} {prepay} {link}" },
  booking_declined_guest: { subject: "Даты заняты", body: "К сожалению, «{listing}» не сможет принять вас {dates}.\n\nПохожие варианты: {link}", vars: "{listing} {dates} {link}" },
  booking_message: { subject: "Новое сообщение по заявке №{number}", body: "{text}\n\nОтветить: {link}", vars: "{number} {text} {link}" },
  listing_rejected: { subject: "Объявление нужно поправить", body: "Объявление «{listing}» не прошло проверку.\n\nПричина: {reason}\n\nИсправить: {link}", vars: "{listing} {reason} {link}" },
  search_alert: { subject: "Новые варианты: {title}", body: "По вашему поиску «{title}» появились новые объявления:\n\n{items}\n\nВсе варианты: {link}\n\nОтписаться: {unsubscribe}", vars: "{title} {items} {link} {unsubscribe}" },
  id_checked: { subject: "Проверка личности: {result}", body: "Здравствуйте!\n\n{text}\n\n{link}", vars: "{result} {text} {link}" },
  listing_approved: { subject: "Объявление проверено", body: "Объявление «{listing}» проверено модератором и показывается в поиске.\n\n{link}", vars: "{listing} {link}" },
};

export function fill(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export async function sendTemplate(to: string, key: string, vars: Record<string, string | number>) {
  const s = await getSettings();
  const row = await db.emailTemplate.findUnique({ where: { key } });
  const tpl = row ?? EMAIL_DEFAULTS[key];
  const all = { site: s.siteName, ...vars };
  return sendMail(to, fill(tpl.subject, all), fill(tpl.body, all));
}

export async function sendMail(to: string, subject: string, text: string) {
  const s = await getSettings();
  const host = s.smtpHost || process.env.SMTP_HOST;
  if (!host) {
    await db.emailLog.create({ data: { to, subject, status: "logged" } });
    if (process.env.NODE_ENV !== "production") console.log(`[mail] ${to}: ${subject}\n${text}`);
    return;
  }
  try {
    const t = nodemailer.createTransport({
      host, port: Number(s.smtpPort || process.env.SMTP_PORT || 465), secure: Number(s.smtpPort || 465) === 465,
      auth: { user: s.smtpUser || process.env.SMTP_USER, pass: s.smtpPass || process.env.SMTP_PASS },
    });
    await t.sendMail({ from: s.smtpFrom || process.env.SMTP_FROM, to, subject, text });
    await db.emailLog.create({ data: { to, subject, status: "sent" } });
  } catch (e) {
    await db.emailLog.create({ data: { to, subject, status: "failed", error: String(e).slice(0, 500) } });
  }
}
