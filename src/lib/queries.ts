import "server-only";
import { cache } from "react";
import { db } from "./db";
import { getSettings } from "./settings";
import type { Prisma } from "@/generated/prisma/client";

export const resortOptions = cache(async () => {
  const [r, counts] = await Promise.all([
    db.resort.findMany({ where: { isActive: true, region: { isActive: true } }, include: { region: true }, orderBy: [{ region: { sort: "asc" } }, { sort: "asc" }] }),
    db.listing.groupBy({ by: ["resortId"], where: await visibleWhere(), _count: true }),
  ]);
  const c = new Map(counts.map(x => [x.resortId, x._count]));
  return r.map(x => ({ name: x.name, slug: x.slug, region: x.region.name, count: c.get(x.id) ?? 0, popular: x.isPopular }));
});

export async function visibleWhere(): Promise<Prisma.ListingWhereInput> {
  const s = await getSettings();
  return {
    status: "PUBLISHED",
    moderation: s.postModeration ? { in: ["PENDING", "APPROVED"] } : "APPROVED",
    owner: { status: "ACTIVE" },
    resort: { isActive: true },
  };
}

export const cardInclude = {
  photos: { orderBy: { sort: "asc" as const }, take: 6 },
  resort: true,
  prices: true,
} satisfies Prisma.ListingInclude;

export type CardListing = Prisma.ListingGetPayload<{ include: typeof cardInclude }>;

export type Filters = { type?: string[]; sea?: number; priceMax?: number; priceMin?: number; amen?: string[]; beach?: string; verified?: boolean; guests?: number; sort?: string; page?: number };

export async function searchListings(base: Prisma.ListingWhereInput, f: Filters) {
  const s = await getSettings();
  const where: Prisma.ListingWhereInput = { AND: [await visibleWhere(), base] };
  const and = where.AND as Prisma.ListingWhereInput[];
  if (f.type?.length) and.push({ type: { in: f.type as any } });
  if (f.sea) and.push({ seaDistance: { lte: f.sea } });
  if (f.priceMax) and.push({ priceFrom: { lte: f.priceMax } });
  if (f.priceMin) and.push({ priceFrom: { gte: f.priceMin } });
  if (f.beach) and.push({ beachType: f.beach as any });
  if (f.verified) and.push({ verified: true });
  if (f.guests) and.push({ maxGuests: { gte: f.guests } });
  for (const code of f.amen ?? []) and.push({ amenities: { some: { amenity: { code } } } });
  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    f.sort === "price" ? [{ priceFrom: "asc" }] :
    f.sort === "sea" ? [{ seaDistance: { sort: "asc", nulls: "last" } }] :
    f.sort === "rating" ? [{ ratingAvg: "desc" }] :
    f.sort === "new" ? [{ publishedAt: "desc" }] :
    [{ promotedUntil: { sort: "desc", nulls: "last" } }, { boostedAt: { sort: "desc", nulls: "last" } }, { verified: "desc" }, { ratingAvg: "desc" }];
  const take = Number(s.pageSize) || 20;
  const page = Math.max(1, f.page ?? 1);
  const [items, total] = await Promise.all([
    db.listing.findMany({ where, include: cardInclude, orderBy, take, skip: (page - 1) * take }),
    db.listing.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / take)) };
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters & { ci?: string; co?: string; adults: number; children: number } {
  const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []) as string[];
  const adults = Number(sp.adults) || 2, children = Number(sp.children) || 0;
  const okDate = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return {
    type: arr(sp.type), amen: arr(sp.amen), sea: Number(sp.sea) || undefined, priceMax: Number(sp.price) || undefined, priceMin: Number(sp.pmin) || undefined,
    beach: typeof sp.beach === "string" ? sp.beach : undefined, verified: sp.verified === "1", sort: typeof sp.sort === "string" ? sp.sort : "rec",
    page: Number(sp.page) || 1, ci: okDate(sp.ci), co: okDate(sp.co), adults, children, guests: adults + children,
  };
}

// Как устроена выдача: курорт, подборка или вся база
export async function scopeWhere(scope: { resort?: string; filter?: string }): Promise<Prisma.ListingWhereInput | null> {
  const and: Prisma.ListingWhereInput[] = [];
  if (scope.resort) {
    const r = await db.resort.findUnique({ where: { slug: scope.resort }, select: { id: true, isActive: true } });
    if (!r || !r.isActive) return null;
    and.push({ resortId: r.id });
  }
  if (scope.filter) {
    const { collectionBySlug } = await import("./collections");
    const c = collectionBySlug(scope.filter);
    if (!c) return null;
    and.push(c.where);
  }
  return { AND: and };
}

// Гистограмма цен для ползунка: сколько объявлений в каждом ценовом диапазоне
export async function priceHistogram(base: Prisma.ListingWhereInput) {
  const rows = await db.listing.findMany({ where: { AND: [await visibleWhere(), base, { priceFrom: { gt: 0 } }] }, select: { priceFrom: true } });
  const prices = rows.map(r => r.priceFrom).sort((a, b) => a - b);
  if (!prices.length) return { min: 0, max: 0, bins: [] as number[] };
  const min = Math.floor(prices[0] / 500) * 500, max = Math.ceil(prices[Math.floor(prices.length * 0.97)] / 500) * 500 || min + 500;
  const n = 24, step = Math.max(1, (max - min) / n);
  const bins = Array(n).fill(0);
  for (const p of prices) bins[Math.min(n - 1, Math.max(0, Math.floor((p - min) / step)))]++;
  return { min, max, bins };
}
