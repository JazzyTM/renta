import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";

// Что доступно владельцу сейчас: бесплатный период, купленный/выданный тариф или базовые лимиты
export async function ownerPlan(userId: string) {
  const s = await getSettings();
  const sub = await db.subscription.findFirst({ where: { userId, startsAt: { lte: new Date() }, endsAt: { gt: new Date() } }, include: { tariff: true }, orderBy: { endsAt: "desc" } });
  const freeUntil = /^\d{4}-\d{2}-\d{2}$/.test(String(s.freePlacementUntil)) ? new Date(s.freePlacementUntil + "T23:59:59+03:00") : null;
  const free = !!freeUntil && freeUntil > new Date();
  const base = { maxListings: Number(s.maxListingsFree), maxPhotos: Number(s.maxPhotos), showStats: true, priorityBoost: 0 };
  const fromFree = free ? { maxListings: Number(s.freeMaxListings), maxPhotos: Number(s.maxPhotos), showStats: true, priorityBoost: 0 } : base;
  const t = sub?.tariff;
  return {
    sub, free, freeUntil,
    name: t ? t.name : free ? "Бесплатный период" : "Базовый",
    maxListings: Math.max(t?.maxListings ?? 0, fromFree.maxListings),
    maxPhotos: Math.min(Number(s.maxPhotos), Math.max(t?.maxPhotos ?? 0, fromFree.maxPhotos)),
    showStats: true,
    priorityBoost: t?.priorityBoost ?? 0,
  };
}
