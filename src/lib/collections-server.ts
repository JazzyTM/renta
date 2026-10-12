import "server-only";
import { cache } from "react";
import { db } from "./db";
import { visibleWhere } from "./queries";
import { getSettings } from "./settings";
import { COLLECTIONS } from "./collections";

// Сколько объявлений в каждой подборке курорта. Пустые подборки не показываем и не отдаём поисковикам.
export const collectionCounts = cache(async (resortId: string) => {
  const vis = await visibleWhere();
  const counts = await Promise.all(COLLECTIONS.map(c => db.listing.count({ where: { AND: [vis, { resortId }, c.where] } })));
  return COLLECTIONS.map((c, i) => ({ ...c, count: counts[i] }));
});

export async function minForIndex() {
  return Math.max(1, Number((await getSettings()).seoMinListings) || 1);
}

export async function seoText(resortId: string, filter: string) {
  const rows = await db.seoPage.findMany({ where: { filter, isActive: true, OR: [{ resortId }, { resortId: null }] } });
  return rows.find(r => r.resortId === resortId) ?? rows.find(r => r.resortId === null) ?? null;
}
