import "server-only";
import { db } from "./db";
import { renderTemplate, sendMail, sendTemplate } from "./mail";
import { getSettings } from "./settings";
import { esc, tgAdmin, tgSend } from "./telegram";

// Строки со ссылками из письма убираем: в Telegram вместо них кнопка «Открыть на сайте»
const noLinks = (body: string) => body.split("\n").filter(l => !/https?:\/\//.test(l)).join("\n").replace(/\n{3,}/g, "\n\n").trim();
const tgText =(subject: string, body: string) => `<b>${esc(subject)}</b>${body ? `\n\n${esc(body)}` : ""}`;

// Уведомление в колокольчике на сайте + в Telegram, если подключён
export async function notify(userId: string, title: string, body: string, link?: string) {
  await db.notification.create({ data: { userId, title, body, link } });
  const u = await db.user.findUnique({ where: { id: userId }, select: { telegramChatId: true } });
  if (u?.telegramChatId) await tgSend(u.telegramChatId, tgText(title, body), link);
}

// Уведомление + письмо по шаблону. В Telegram уходит тот же текст, что и в письме.
export async function notifyEmail(userId: string, key: string, vars: Record<string, string | number>, title: string, link?: string) {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return;
  await db.notification.create({ data: { userId, title, body: "", link } });
  if (u.email) await sendTemplate(u.email, key, vars);
  if (u.telegramChatId) {
    const t = await renderTemplate(key, vars);
    await tgSend(u.telegramChatId, tgText(t.subject, noLinks(t.body)), link);
  }
}

// Гостю по заявке: письмо на почту из заявки, а если у гостя есть аккаунт — ещё колокольчик и Telegram
export async function notifyGuest(b: { guestId: string | null; guestEmail: string }, key: string, vars: Record<string, string | number>, link: string) {
  await sendTemplate(b.guestEmail, key, vars);
  if (!b.guestId) return;
  const t = await renderTemplate(key, vars);
  await db.notification.create({ data: { userId: b.guestId, title: t.subject, body: "", link } });
  const u = await db.user.findUnique({ where: { id: b.guestId }, select: { telegramChatId: true } });
  if (u?.telegramChatId) await tgSend(u.telegramChatId, tgText(t.subject, noLinks(t.body)), link);
}

// Администрации: чат Telegram из настроек и почта для уведомлений
export async function notifyAdmin(title: string, text: string, link?: string) {
  const s = await getSettings();
  await tgAdmin(tgText(title, text), link).catch(() => {});
  if (s.adminNotifyEmail) await sendMail(String(s.adminNotifyEmail), title, `${text}${link ? `\n\n${(process.env.APP_URL || "") + link}` : ""}`).catch(() => {});
}
