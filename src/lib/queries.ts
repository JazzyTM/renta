import "server-only";
import { cache } from "react";
import { db } from "./db";
import { getSettings } from "./settings";
import type { Prisma } from "@/generated/prisma/client";

export const resortOptions = cache(async () => {
  const r = await db.resort.findMany({ where: { isActive: true, region: { isActive: true } }, include: { region: true }, orderBy: [{ region: { sort: "asc" } }, { sort: "asc" }] });
  return r.map(x => ({ name: x.name, slug: x.slug, region: x.region.name }));
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
  photos: { orderBy: { sort: "asc" as const }, take: 1 },
  resort: true,
  prices: true,
} satisfies Prisma.ListingInclude;

export type CardListing = Prisma.ListingGetPayload<{ include: typeof cardInclude }>;

export type Filters = { type?: string[]; sea?: number; priceMax?: number; amen?: string[]; beach?: string; verified?: boolean; guests?: number; sort?: string; page?: number };

export async function searchListings(base: Prisma.ListingWhereInput, f: Filters) {
  const s = await getSettings();
  const where: Prisma.ListingWhereInput = { AND: [await visibleWhere(), base] };
  const and = where.AND as Prisma.ListingWhereInput[];
  if (f.type?.length) and.push({ type: { in: f.type as any } });
  if (f.sea) and.push({ seaDistance: { lte: f.sea } });
  if (f.priceMax) and.push({ priceFrom: { lte: f.priceMax } });
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
    type: arr(sp.type), amen: arr(sp.amen), sea: Number(sp.sea) || undefined, priceMax: Number(sp.price) || undefined,
    beach: typeof sp.beach === "string" ? sp.beach : undefined, verified: sp.verified === "1", sort: typeof sp.sort === "string" ? sp.sort : "rec",
    page: Number(sp.page) || 1, ci: okDate(sp.ci), co: okDate(sp.co), adults, children, guests: adults + children,
  };
}
