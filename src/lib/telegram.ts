import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";
import { sign } from "./sign";

// Уведомления в Telegram. Бот работает через long polling (src/lib/telegram-poll.ts),
// поэтому публичный HTTPS-адрес для вебхука не нужен.

export const esc = (s: string) => s.replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);

async function token() {
  const s = await getSettings();
  return s.telegramOn ? String(s.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || "") : "";
}

export async function tgApi<T = any>(method: string, body: Record<string, unknown> = {}, opts: { timeoutMs?: number; tok?: string } = {}): Promise<T | null> {
  const t = opts.tok ?? (await token());
  if (!t) return null;
  const r = await fetch(`https://api.telegram.org/bot${t}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 10000), cache: "no-store",
  });
  const j = await r.json().catch(() => null);
  if (!j?.ok) throw new Error(j?.description || `Telegram ${r.status}`);
  return j.result as T;
}

// Сообщение в чат. link — относительный путь на сайте, станет кнопкой «Открыть на сайте».
export async function tgSend(chatId: string | null | undefined, html: string, link?: string) {
  if (!chatId) return false;
  const app = (process.env.APP_URL || "").replace(/\/$/, "");
  const url = link ? (link.startsWith("http") ? link : app + link) : "";
  const base = { chat_id: chatId, text: html.slice(0, 4000), parse_mode: "HTML", link_preview_options: { is_disabled: true } };
  try {
    if (url.startsWith("http")) {
      try { await tgApi("sendMessage", { ...base, reply_markup: { inline_keyboard: [[{ text: "Открыть на сайте", url }]] } }); return true; }
      catch { /* Telegram не принял ссылку (например, адрес по IP) — отправим ссылку текстом */ }
      await tgApi("sendMessage", { ...base, text: `${base.text}\n\n${esc(url)}` });
      return true;
    }
    await tgApi("sendMessage", base);
    return true;
  } catch (e) {
    console.error("[telegram]", (e as Error).message);
    return false;
  }
}

export async function tgUser(userId: string, html: string, link?: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { telegramChatId: true } });
  return tgSend(u?.telegramChatId, html, link);
}

// Код для ссылки t.me/бот?start=код: id пользователя и подпись (до 64 символов, только A-Z a-z 0-9 _ -)
export const linkCode = (userId: string) => `${userId}_${sign("tg:" + userId).slice(0, 16)}`;
function checkCode(code: string) {
  const i = code.lastIndexOf("_");
  if (i < 1) return null;
  const id = code.slice(0, i);
  return code === linkCode(id) ? id : null;
}

let me: { username: string; at: number; tok: string } | null = null;
export async function botUsername() {
  const s = await getSettings();
  if (s.telegramBotUsername) return String(s.telegramBotUsername).replace(/^@/, "");
  const t = await token();
  if (!t) return null;
  if (me && me.tok === t && Date.now() - me.at < 3600_000) return me.username;
  try {
    const r = await tgApi<{ username: string }>("getMe", {}, { tok: t });
    me = { username: r!.username, at: Date.now(), tok: t };
    return me.username;
  } catch { return null; }
}

export const botEnabled = async () => !!(await token());

type Update = { update_id: number; message?: { chat: { id: number; type: string; title?: string }; from?: { username?: string; first_name?: string }; text?: string } };

// Обработка входящих сообщений боту
export async function handleUpdate(up: Update) {
  const m = up.message;
  if (!m?.text) return;
  const chat = String(m.chat.id);
  const s = await getSettings();
  const [cmd, arg] = m.text.trim().split(/\s+/, 2);
  if (cmd.startsWith("/start") && arg) {
    const userId = checkCode(arg);
    if (!userId) { await tgSend(chat, "Ссылка устарела. Откройте профиль на сайте и нажмите «Подключить Telegram» ещё раз."); return; }
    const name = m.from?.username ? "@" + m.from.username : m.from?.first_name || m.chat.title || "";
    await db.user.updateMany({ where: { telegramChatId: chat, id: { not: userId } }, data: { telegramChatId: null, telegramName: null } });
    await db.user.update({ where: { id: userId }, data: { telegramChatId: chat, telegramName: name || null } });
    await tgSend(chat, `✅ Готово! Уведомления «${esc(s.siteName)}» будут приходить сюда: новые заявки, сообщения гостей, ответы хозяев.\n\nОтключить: /stop`, "/account");
    return;
  }
  if (cmd.startsWith("/stop")) {
    const r = await db.user.updateMany({ where: { telegramChatId: chat }, data: { telegramChatId: null, telegramName: null } });
    await tgSend(chat, r.count ? "Уведомления отключены. Подключить снова можно в профиле на сайте." : "Этот чат не подключён к аккаунту.");
    return;
  }
  // Любое другое сообщение: подсказка и номер чата (его вставляют в настройки как чат администрации)
  await tgSend(chat, `Это бот сайта «${esc(s.siteName)}». Чтобы получать уведомления, откройте на сайте «Профиль» и нажмите «Подключить Telegram».\n\nНомер этого чата: <code>${chat}</code>`);
}

// Уведомление администрации: чат из настроек (можно группу) и почта
export async function tgAdmin(html: string, link?: string) {
  const s = await getSettings();
  const chat = String(s.telegramAdminChat || "").trim();
  if (chat) await tgSend(chat, html, link);
}
