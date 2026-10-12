import "server-only";
import { headers } from "next/headers";

// Ограничение частоты запросов. Сайт работает одним процессом, поэтому счётчики в памяти.
const hits = new Map<string, number[]>();

export async function clientIp() {
  const h = await headers();
  // nginx дописывает настоящий адрес клиента в конец X-Forwarded-For; начало подделывается
  const xff = h.get("x-forwarded-for");
  return (xff ? xff.split(",").pop()!.trim() : h.get("x-real-ip")) || "local";
}

// true — можно, false — превышен лимит
export function allow(key: string, max: number, windowSec: number) {
  const now = Date.now(), from = now - windowSec * 1000;
  const list = (hits.get(key) ?? []).filter(t => t > from);
  if (list.length >= max) { hits.set(key, list); return false; }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 50_000) for (const [k, v] of hits) if (!v.some(t => t > from)) hits.delete(k);
  return true;
}

export async function limit(name: string, max: number, windowSec: number, extra?: string) {
  const ip = await clientIp();
  return allow(`${name}:${ip}`, max, windowSec) && (!extra || allow(`${name}:${extra}`, max, windowSec));
}

export const TOO_MANY = "Слишком много попыток. Подождите немного и попробуйте снова";

// Поле-ловушка: обычный посетитель его не видит, бот заполняет
export const isBot = (fd: FormData) => !!String(fd.get("website") ?? "").trim();
