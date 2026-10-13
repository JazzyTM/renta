import "server-only";
import { randomBytes } from "crypto";
import { db } from "./db";
import { getSettings } from "./settings";
import { notify } from "./notify";

// Личный код приглашения хозяина, создаётся при первом обращении
export async function refCodeOf(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { refCode: true } });
  if (u?.refCode) return u.refCode;
  for (let i = 0; i < 5; i++) {
    const code = randomBytes(4).toString("hex");
    try { await db.user.update({ where: { id: userId }, data: { refCode: code } }); return code; } catch {}
  }
  throw new Error("Не удалось создать код");
}

// Новый пользователь пришёл по ссылке /r/КОД: запоминаем, кто пригласил
export async function attachReferrer(userId: string, code?: string | null) {
  if (!code) return;
  const r = await db.user.findUnique({ where: { refCode: code }, select: { id: true } });
  if (!r || r.id === userId) return;
  await db.user.updateMany({ where: { id: userId, referredById: null }, data: { referredById: r.id } });
}

// Приглашённый опубликовал первое объявление: пригласившему продлеваем тариф
export async function rewardReferrer(userId: string) {
  const s = await getSettings();
  const days = Number(s.referralDays) || 0;
  if (!s.referralOn || days <= 0) return;
  const u = await db.user.findUnique({ where: { id: userId }, select: { referredById: true, name: true, email: true } });
  if (!u?.referredById) return;
  const note = `ref:${userId}`;
  if (await db.subscription.findFirst({ where: { note } })) return;
  const now = new Date();
  const cur = await db.subscription.findFirst({ where: { userId: u.referredById, endsAt: { gt: now } }, orderBy: { endsAt: "desc" } });
  const tariffId = cur?.tariffId ?? (await db.tariff.findFirst({ where: { isActive: true }, orderBy: [{ price: "asc" }, { sort: "asc" }] }))?.id;
  if (!tariffId) return;
  const start = cur ? cur.endsAt : now;
  await db.subscription.create({ data: { userId: u.referredById, tariffId, startsAt: start, endsAt: new Date(start.getTime() + days * 86400000), amount: 0, note } });
  await notify(u.referredById, `Бонус за приглашение: +${days} дн. тарифа`, `${u.name || u.email || "Приглашённый хозяин"} опубликовал объявление.`, "/cabinet/referral").catch(() => {});
}
