import "server-only";
import nodemailer from "nodemailer";
import { db } from "./db";
import { getSettings } from "./settings";
import { mailHtml } from "./mail-html";

// Шаблоны по умолчанию. Админ может переопределить их в разделе «Письма».
export const EMAIL_DEFAULTS: Record<string, { subject: string; body: string; vars: string }> = {
  verify_email: { subject: "Подтвердите почту", body: "Здравствуйте, {name}!\n\nЧтобы подтвердить почту, перейдите по ссылке:\n{link}\n\nЕсли вы не регистрировались на {site}, просто удалите это письмо.", vars: "{name} {link} {site}" },
  login_code: { subject: "Код для входа: {code}", body: "Ваш код для входа на {site}: {code}\n\nКод действует 15 минут. Если вы не запрашивали код, просто удалите это письмо.", vars: "{code} {site}" },
  password_reset: { subject: "Восстановление пароля", body: "Здравствуйте!\n\nЧтобы задать новый пароль, перейдите по ссылке:\n{link}\n\nСсылка действует 2 часа.", vars: "{link} {site}" },
  booking_new_owner: { subject: "Новая заявка на {dates}", body: "{guest} хочет приехать в «{listing}».\n\nДаты: {dates}\nГостей: {guests}\nКомментарий: {comment}\n\nОтветить гостю: {link}\n\nГость ждёт ответа. Ответьте, даже если даты заняты — так он быстрее найдёт другое жильё.", vars: "{guest} {listing} {dates} {guests} {comment} {link}" },
  booking_accepted_guest: { subject: "Хозяин подтвердил даты", body: "Хозяин «{listing}» подтвердил ваши даты.\n\nДаты: {dates}\nПредоплата: {prepay}\n\nРеквизиты для предоплаты хозяин пришлёт в переписке.\n\nОткрыть переписку: {link}", vars: "{listing} {dates} {prepay} {link}" },
  booking_declined_guest: { subject: "Даты заняты", body: "К сожалению, «{listing}» не сможет принять вас {dates}.\n\nПохожие варианты: {link}", vars: "{listing} {dates} {link}" },
  booking_message: { subject: "Новое сообщение по заявке №{number}", body: "{text}\n\nОтветить: {link}", vars: "{number} {text} {link}" },
  listing_rejected: { subject: "Объявление нужно поправить", body: "Объявление «{listing}» не прошло проверку.\n\nПричина: {reason}\n\nИсправить: {link}", vars: "{listing} {reason} {link}" },
  search_alert: { subject: "Новые варианты: {title}", body: "По вашему поиску «{title}» появились новые объявления:\n\n{items}\n\nВсе варианты: {link}\n\nОтписаться: {unsubscribe}", vars: "{title} {items} {link} {unsubscribe}" },
  id_checked: { subject: "Проверка личности: {result}", body: "Здравствуйте!\n\n{text}\n\n{link}", vars: "{result} {text} {link}" },
  listing_approved: { subject: "Объявление проверено", body: "Объявление «{listing}» проверено модератором и показывается в поиске.\n\nОткрыть объявление: {link}", vars: "{listing} {link}" },
};

// Настроена ли отправка писем (без неё вход по коду не показываем)
export async function mailEnabled() {
  const s = await getSettings();
  return !!(s.smtpHost || process.env.SMTP_HOST);
}

export function fill(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

// Текст письма по шаблону (он же уходит в Telegram)
export async function renderTemplate(key: string, vars: Record<string, string | number>) {
  const s = await getSettings();
  const row = await db.emailTemplate.findUnique({ where: { key } });
  const tpl = row ?? EMAIL_DEFAULTS[key];
  const all = { site: s.siteName, ...vars };
  return { subject: fill(tpl.subject, all), body: fill(tpl.body, all) };
}

export async function sendTemplate(to: string, key: string, vars: Record<string, string | number>) {
  const t = await renderTemplate(key, vars);
  return sendMail(to, t.subject, t.body, { key, vars });
}

// Примеры подстановок: превью в админке и тестовые письма. Ссылки с «/» дополняются адресом сайта.
export const EMAIL_SAMPLES: Record<string, Record<string, string | number>> = {
  verify_email: { name: "Анна", link: "/verify?t=example" },
  login_code: { code: "482915" },
  password_reset: { link: "/reset?t=example" },
  booking_new_owner: { guest: "Иван Петров", listing: "Гостевой дом «Морской бриз»", dates: "12–19 июля", guests: 3, comment: "Едем с ребёнком 5 лет, нужна детская кроватка. Приедем к вечеру.", link: "/cabinet" },
  booking_accepted_guest: { listing: "Гостевой дом «Морской бриз»", dates: "12–19 июля", prepay: "3 000 ₽", link: "/my" },
  booking_declined_guest: { listing: "Гостевой дом «Морской бриз»", dates: "12–19 июля", link: "/kurort/sochi" },
  booking_message: { number: 101, text: "Здравствуйте! Парковка у дома есть, место бесплатное. Ждём вас.", link: "/my" },
  listing_rejected: { listing: "Гостевой дом «Морской бриз»", reason: "На фото есть телефон и логотип другого сайта. Уберите их и отправьте объявление ещё раз.", link: "/cabinet" },
  search_alert: { title: "Сочи, с бассейном", items: "Гостевой дом «Морской бриз», Сочи, от 3 500 ₽\n/kurort/sochi\n\nКвартира у набережной, Адлер, от 4 200 ₽\n/kurort/adler", link: "/kurort/sochi", unsubscribe: "/alerts/off/example" },
  id_checked: { result: "подтверждена", text: "Личность подтверждена, в объявлениях появилась отметка. Фото документа удалено.", link: "/cabinet/verify" },
  listing_approved: { listing: "Гостевой дом «Морской бриз»", link: "/cabinet" },
};

async function mailLook() {
  const s = await getSettings();
  return { siteName: String(s.siteName), baseUrl: process.env.APP_URL || "", tagline: "Жильё у моря без посредников" };
}

/** Письмо с примером подстановок: превью в админке (tpl — несохранённый текст) */
export async function previewTemplate(key: string, tpl?: { subject: string; body: string }) {
  const s = await getSettings();
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  const vars = Object.fromEntries(Object.entries(EMAIL_SAMPLES[key] ?? {}).map(([k, v]) => [k, typeof v === "string" ? v.replace(/(^|\n)\//g, `$1${base}/`) : v]));
  const all = { site: String(s.siteName), ...vars };
  const t = tpl ? { subject: fill(tpl.subject, all), body: fill(tpl.body, all) } : await renderTemplate(key, vars);
  return { ...t, vars, html: mailHtml(await mailLook(), t.subject, t.body, key, vars) };
}

export async function sendMail(to: string, subject: string, text: string, tpl?: { key: string; vars: Record<string, string | number> }) {
  const s = await getSettings();
  const host = s.smtpHost || process.env.SMTP_HOST;
  if (!host) {
    await db.emailLog.create({ data: { to, subject, status: "logged" } });
    if (process.env.NODE_ENV !== "production") console.log(`[mail] ${to}: ${subject}\n${text}`);
    return;
  }
  try {
    // Все параметры берём из одного места: из админки, если там задан сервер, иначе из окружения
    const fromAdmin = !!s.smtpHost;
    const port = Number((fromAdmin ? s.smtpPort : process.env.SMTP_PORT) || 465);
    const user = fromAdmin ? s.smtpUser : process.env.SMTP_USER, pass = fromAdmin ? s.smtpPass : process.env.SMTP_PASS;
    const t = nodemailer.createTransport({ host, port, secure: port === 465, ...(user ? { auth: { user: String(user), pass: String(pass ?? "") } } : {}) });
    // Оформленная HTML-версия + простой текст для почтовиков без HTML
    const html = mailHtml(await mailLook(), subject, text, tpl?.key, tpl?.vars);
    await t.sendMail({ from: s.smtpFrom || process.env.SMTP_FROM, to, subject, text, html });
    await db.emailLog.create({ data: { to, subject, status: "sent" } });
  } catch (e) {
    await db.emailLog.create({ data: { to, subject, status: "failed", error: String(e).slice(0, 500) } });
  }
}
