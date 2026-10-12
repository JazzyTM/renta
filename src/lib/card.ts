// Данные карточки объявления, которые можно передать в браузер
export type CardData = {
  id: string; number: number; title: string; type: string; resort: string; seaDistance: number | null; priceFrom: number;
  ratingAvg: number; ratingCount: number; verified: boolean; highlighted: boolean; photos: string[];
  prices: { month: number; price: number }[]; baseGuests: number; extraGuestPrice: number; prepayType: string; prepayPercent: number; lat: number | null; lng: number | null;
};

type Src = {
  id: string; number: number; title: string; type: string; resort: { name: string }; seaDistance: number | null; priceFrom: number; ratingAvg: number; ratingCount: number;
  verified: boolean; highlightedUntil: Date | null; photos: { url: string }[]; prices: { month: number; price: number }[]; baseGuests: number; extraGuestPrice: number;
  prepayType: string; prepayPercent: number; lat: number | null; lng: number | null;
};

export function toCard(l: Src): CardData {
  return {
    id: l.id, number: l.number, title: l.title, type: l.type, resort: l.resort.name, seaDistance: l.seaDistance, priceFrom: l.priceFrom,
    ratingAvg: l.ratingAvg, ratingCount: l.ratingCount, verified: l.verified, highlighted: !!l.highlightedUntil && l.highlightedUntil > new Date(),
    photos: l.photos.map(p => p.url), prices: l.prices.map(p => ({ month: p.month, price: p.price })), baseGuests: l.baseGuests, extraGuestPrice: l.extraGuestPrice,
    prepayType: l.prepayType, prepayPercent: l.prepayPercent, lat: l.lat, lng: l.lng,
  };
}
