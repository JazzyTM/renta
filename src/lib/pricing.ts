import { nightsBetween } from "./format";

export type PriceRow = { month: number; price: number };
export type ListingPricing = { prices: PriceRow[]; priceFrom: number; baseGuests: number; extraGuestPrice: number; prepayType: string; prepayPercent: number };

export function nightPrice(l: ListingPricing, d: Date) {
  return l.prices.find(p => p.month === d.getUTCMonth() + 1)?.price ?? l.priceFrom;
}

export function quote(l: ListingPricing, ci: Date, co: Date, guests: number) {
  const n = nightsBetween(ci, co);
  if (!n) return null;
  const groups: { price: number; n: number }[] = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p = nightPrice(l, new Date(ci.getTime() + i * 86400000));
    sum += p;
    const g = groups.find(x => x.price === p);
    if (g) g.n++; else groups.push({ price: p, n: 1 });
  }
  const extraGuests = Math.max(0, guests - l.baseGuests);
  const extra = extraGuests * l.extraGuestPrice * n;
  const total = sum + extra;
  const prepay = l.prepayType === "NONE" ? 0 : l.prepayType === "NIGHT" ? nightPrice(l, ci) : Math.round(total * l.prepayPercent / 100 / 100) * 100;
  return { n, groups, extraGuests, extra, total, prepay };
}

export function minPrice(prices: PriceRow[]) {
  const v = prices.map(p => p.price).filter(p => p > 0);
  return v.length ? Math.min(...v) : 0;
}
