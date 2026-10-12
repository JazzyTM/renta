export const MONTHS_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
export const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

export function rub(n: number) {
  return Math.round(n).toLocaleString("ru-RU") + " ₽";
}

export function plural(n: number, forms: [string, string, string]) {
  const a = n % 10, b = n % 100;
  return forms[a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 1 : 2];
}

export function fmtDate(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getUTCDate()} ${MONTHS_GEN[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function fmtDateTime(d: Date) {
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
}

export function fmtRange(a: Date, b: Date) {
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear())
    return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS_GEN[b.getUTCMonth()]}`;
  return `${a.getUTCDate()} ${MONTHS_GEN[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS_GEN[b.getUTCMonth()]}`;
}

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const parseDate = (s: string) => new Date(s + "T00:00:00Z");
export const nightsBetween = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
export const walkMinutes = (m: number) => Math.max(1, Math.round(m / 75));
