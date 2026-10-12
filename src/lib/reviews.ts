import "server-only";
import { db } from "./db";

export async function recomputeRating(listingId: string) {
  const a = await db.review.aggregate({ where: { listingId, status: "PUBLISHED" }, _avg: { rating: true }, _count: true });
  await db.listing.update({ where: { id: listingId }, data: { ratingAvg: a._avg.rating ?? 0, ratingCount: a._count } });
}
