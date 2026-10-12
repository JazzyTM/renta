import "server-only";
import { db } from "./db";
import { getUser, isStaff } from "./auth";
import { checkSign } from "./sign";

export const bookingInclude = { listing: { include: { photos: { take: 1, orderBy: { sort: "asc" as const } }, resort: true } }, messages: { orderBy: { createdAt: "asc" as const } } };

// Кто смотрит заявку: гость (по ссылке из письма или своему аккаунту), хозяин или сотрудник
export async function bookingAccess(number: number, k?: string | null) {
  const b = await db.booking.findUnique({ where: { number }, include: bookingInclude });
  if (!b) return null;
  const u = await getUser();
  const role = u && u.id === b.listing.ownerId ? "owner" : (checkSign(number, k) || (u && (u.id === b.guestId || u.email === b.guestEmail))) ? "guest" : u && isStaff(u.role) ? "staff" : null;
  return role ? { b, role, user: u } : null;
}
