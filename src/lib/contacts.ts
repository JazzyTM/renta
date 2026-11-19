// Каналы связи с хозяином: телефон и мессенджеры. Хозяин пишет как удобно (@имя, ссылку, номер),
// здесь всё приводится к рабочим ссылкам.

export type ChannelKind = "wa" | "tg" | "max" | "vk";
export type Channel = { kind: ChannelKind; label: string; href: string };
type Src = { contactPhone: string; whatsapp: boolean; telegram: string | null; max: string | null; vk: string | null };

export const CHANNEL_LABEL: Record<ChannelKind, string> = { wa: "WhatsApp", tg: "Telegram", max: "MAX", vk: "ВКонтакте" };

const digits = (s: string) => s.replace(/\D/g, "");
/** Номер в международном виде без плюса: 8 999… → 7999… */
export function phoneIntl(phone: string) {
  const d = digits(phone);
  return d.length === 11 && d[0] === "8" ? "7" + d.slice(1) : d.length === 10 ? "7" + d : d;
}
const noProto = (v: string) => v.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");

export function tgHref(v: string | null) {
  if (!v?.trim()) return null;
  const s = noProto(v);
  const link = s.match(/^(?:t\.me|telegram\.me)\/(.+)$/i);
  if (link) return `https://t.me/${link[1]}`;
  if (/^\+?[\d\s()-]{10,}$/.test(s)) return `https://t.me/+${phoneIntl(s)}`;
  const u = s.replace(/^@/, "");
  return /^[A-Za-z][\w]{3,31}$/.test(u) ? `https://t.me/${u}` : null;
}

export function maxHref(v: string | null) {
  if (!v?.trim()) return null;
  const s = noProto(v);
  return /^max\.ru\/\S+$/i.test(s) ? `https://${s}` : null;
}

export function vkHref(v: string | null) {
  if (!v?.trim()) return null;
  const s = noProto(v);
  const link = s.match(/^(?:m\.)?vk\.(?:com|ru)\/([\w.]+)$/i);
  if (link) return `https://vk.com/${link[1]}`;
  const u = s.replace(/^@/, "");
  return /^[A-Za-z0-9_.]{3,32}$/.test(u) ? `https://vk.com/${u}` : null;
}

/** Проверка полей при сохранении: текст ошибки или null */
export function checkChannels(c: { telegram: string | null; max: string | null; vk: string | null }) {
  if (c.telegram && !tgHref(c.telegram)) return "Telegram: укажите @имя, ссылку t.me/… или номер";
  if (c.max && !maxHref(c.max)) return "MAX: вставьте ссылку на профиль вида max.ru/…";
  if (c.vk && !vkHref(c.vk)) return "ВКонтакте: укажите ссылку vk.com/… или короткое имя";
  return null;
}

/** Ссылки на мессенджеры (показываются вместе с телефоном) */
export function channels(c: Src): Channel[] {
  const out: Channel[] = [];
  const wa = c.whatsapp && phoneIntl(c.contactPhone).length >= 11 ? `https://wa.me/${phoneIntl(c.contactPhone)}` : null;
  const list: [ChannelKind, string | null][] = [["wa", wa], ["tg", tgHref(c.telegram)], ["max", maxHref(c.max)], ["vk", vkHref(c.vk)]];
  for (const [kind, href] of list) if (href) out.push({ kind, label: CHANNEL_LABEL[kind], href });
  return out;
}

/** Какие мессенджеры есть, без самих контактов: для подсказки до нажатия «Показать телефон» */
export const channelKinds = (c: Src) => channels(c).map(ch => ch.kind);
