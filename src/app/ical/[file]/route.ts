import { db } from "@/lib/db";
import { checkSign } from "@/lib/sign";
import { buildIcs } from "@/lib/ical";

// Выгрузка подтверждённых броней в формате .ics для Авито, Суточно и т.п.
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const m = (await params).file.match(/^(\d+)-([\w-]+)\.ics$/);
  if (!m) return new Response("not found", { status: 404 });
  const l = await db.listing.findUnique({ where: { number: Number(m[1]) }, select: { id: true, number: true } });
  if (!l || !checkSign("ical" + l.id, m[2])) return new Response("not found", { status: 404 });
  const b = await db.booking.findMany({ where: { listingId: l.id, status: { in: ["PREPAID", "ACCEPTED"] }, checkOut: { gte: new Date() } }, select: { id: true, checkIn: true, checkOut: true } });
  const body = buildIcs(`booking-${l.number}`, b.map(x => ({ start: x.checkIn, end: x.checkOut, uid: `${x.id}@bereg` })));
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}
