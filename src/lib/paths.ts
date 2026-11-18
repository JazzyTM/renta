import { slugify } from "./slug";

// ЧПУ объявления: /kurort/{курорт}/{название-латиницей}-{номер}
// Номер в конце — постоянный ключ; если название поменяли, старый адрес перенаправит на новый.
export const listingPath = (l: { number: number; title: string; resortSlug: string }) =>
  `/kurort/${l.resortSlug}/${slugify(l.title)}-${l.number}`;

// «gostevoy-dom-lavanda-12» → 12; подборки вида «s-basseynom» номера не содержат
export const listingNumber = (segment: string) => {
  const m = segment.match(/-(\d+)$/);
  return m ? Number(m[1]) : null;
};
