import { db } from "@/lib/db";
import { getUser, isStaff } from "@/lib/auth";
import { isoDate } from "@/lib/format";

const esc = (v: unknown) => { const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows: unknown[][]) => "﻿" + rows.map(r => r.map(esc).join(";")).join("\n");

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const u = await getUser();
  if (!u || !isStaff(u.role)) return new Response("forbidden", { status: 403 });
  const { kind } = await params;
  const sp = new URL(req.url).searchParams;
  let rows: unknown[][] = [];
  if (kind === "listings") {
    const list = await db.listing.findMany({ where: { ...(sp.get("status") ? { status: sp.get("status") as any } : {}), ...(sp.get("resort") ? { resort: { slug: sp.get("resort")! } } : {}) }, include: { resort: true, owner: true }, orderBy: { number: "asc" } });
    rows = [["Номер", "Название", "Тип", "Курорт", "Статус", "Проверка", "Цена от", "До моря", "Телефон", "Почта хозяина", "Просмотры", "Показы телефона", "Создано"],
      ...list.map(l => [l.number, l.title, l.type, l.resort.name, l.status, l.moderation, l.priceFrom, l.seaDistance, l.contactPhone, l.owner.email, l.views, l.phoneViews, l.createdAt])];
  } else if (kind === "users") {
    const list = await db.user.findMany({ where: sp.get("role") ? { role: sp.get("role") as any } : {}, include: { _count: { select: { listings: true } } }, orderBy: { createdAt: "asc" } });
    rows = [["Почта", "Имя", "Телефон", "Роль", "Статус", "Объявлений", "Регистрация", "Последний вход"], ...list.map(x => [x.email, x.name, x.phone, x.role, x.status, x._count.listings, x.createdAt, x.lastLoginAt])];
  } else if (kind === "bookings") {
    const list = await db.booking.findMany({ where: sp.get("status") ? { status: sp.get("status") as any } : {}, include: { listing: true }, orderBy: { number: "asc" } });
    rows = [["Номер", "Объект", "Гость", "Почта", "Телефон", "Заезд", "Выезд", "Взрослых", "Детей", "Сумма", "Статус", "Создана"], ...list.map(b => [b.number, b.listing.title, b.guestName, b.guestEmail, b.guestPhone, isoDate(b.checkIn), isoDate(b.checkOut), b.adults, b.children, b.totalEstimate, b.status, b.createdAt])];
  } else return new Response("not found", { status: 404 });
  return new Response(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}-${isoDate(new Date())}.csv"` } });
}
