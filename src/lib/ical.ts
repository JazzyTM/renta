import "server-only";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { db } from "./db";

// Хозяин сам вводит ссылку, поэтому не даём ходить во внутреннюю сеть сервера
const privateIp = (ip: string) => /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip) || /^(::1?$|f[cd]|fe80|::ffff:(127|10|192\.168|169\.254)\.)/i.test(ip);
async function safeFetch(raw: string, hops = 3): Promise<Response> {
  const url = new URL(raw);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Недопустимая ссылка");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map(a => a.address);
  if (!ips.length || ips.some(privateIp)) throw new Error("Недопустимая ссылка");
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "calendar-sync" }, redirect: "manual" });
  const loc = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && loc) {
    if (!hops) throw new Error("Слишком много перенаправлений");
    return safeFetch(new URL(loc, url).toString(), hops - 1);
  }
  return res;
}

const DAY = 86400000;
const d0 = (t: number) => new Date(Math.floor(t / DAY) * DAY);

// Разбирает календарь .ics: берём события VEVENT с датами начала и конца (конец не включается)
export function parseIcs(text: string): [Date, Date][] {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const out: [Date, Date][] = [];
  let start: Date | null = null, end: Date | null = null, inEv = false;
  const parse = (v: string) => {
    const m = v.match(/(\d{4})(\d{2})(\d{2})/);
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  };
  for (const l of lines) {
    if (l === "BEGIN:VEVENT") { inEv = true; start = end = null; }
    else if (l === "END:VEVENT") { if (start) out.push([start, end && end > start ? end : new Date(start.getTime() + DAY)]); inEv = false; }
    else if (inEv && l.startsWith("DTSTART")) start = parse(l.split(":").pop()!);
    else if (inEv && l.startsWith("DTEND")) end = parse(l.split(":").pop()!);
  }
  return out;
}

export function nights(a: Date, b: Date) {
  const res: Date[] = [];
  for (let t = d0(a.getTime()).getTime(); t < b.getTime() && res.length < 400; t += DAY) res.push(new Date(t));
  return res;
}

// Загружает календарь объявления и обновляет занятые даты
export async function syncIcal(listingId: string) {
  const l = await db.listing.findUnique({ where: { id: listingId }, select: { icalUrl: true } });
  if (!l?.icalUrl) return { ok: false, error: "Ссылка не задана" };
  try {
    const res = await safeFetch(l.icalUrl);
    if (!res.ok) throw new Error(`Календарь ответил ${res.status}`);
    const text = (await res.text()).slice(0, 2_000_000);
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("По ссылке не календарь .ics");
    const today = d0(Date.now());
    const dates = [...new Set(parseIcs(text).flatMap(([a, b]) => nights(a, b)).filter(d => d >= today).map(d => d.toISOString().slice(0, 10)))];
    await db.$transaction([
      db.busyDate.deleteMany({ where: { listingId, source: "ical" } }),
      db.busyDate.createMany({ data: dates.map(d => ({ listingId, date: new Date(d), source: "ical" })), skipDuplicates: true }),
      db.listing.update({ where: { id: listingId }, data: { icalSyncedAt: new Date(), icalError: null } }),
    ]);
    return { ok: true, count: dates.length };
  } catch (e) {
    const error = (e as Error).message.slice(0, 200);
    await db.listing.update({ where: { id: listingId }, data: { icalError: error } });
    return { ok: false, error };
  }
}

// Подтверждённая бронь занимает даты в календаре
export async function markBookingBusy(listingId: string, ci: Date, co: Date, busy: boolean) {
  const ds = nights(ci, co);
  if (busy) await db.busyDate.createMany({ data: ds.map(date => ({ listingId, date, source: "booking" })), skipDuplicates: true });
  else await db.busyDate.deleteMany({ where: { listingId, source: "booking", date: { in: ds } } });
}

// Свой календарь для выгрузки на другие площадки
export function buildIcs(name: string, ranges: { start: Date; end: Date; uid: string }[]) {
  const f = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const ev = ranges.map(r => ["BEGIN:VEVENT", `UID:${r.uid}`, `DTSTAMP:${f(new Date())}T000000Z`, `DTSTART;VALUE=DATE:${f(r.start)}`, `DTEND;VALUE=DATE:${f(r.end)}`, "SUMMARY:Занято", "END:VEVENT"].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${name}//RU`, "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR"].join("\r\n");
}
