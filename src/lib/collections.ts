import type { Prisma } from "@/generated/prisma/client";

// «В Анапе», «в Лазаревском», «в Голубицкой». Если правило ошиблось, название поправляют в админке (поле «Где»).
export function guessPrep(name: string) {
  const w = name.trim();
  const rules: [RegExp, string][] = [
    [/ое$/, "ом"], [/ий$/, "ом"], [/ый$/, "ом"], [/ая$/, "ой"], [/ия$/, "ии"], [/ья$/, "ье"], [/а$/, "е"], [/я$/, "е"], [/ь$/, "и"],
  ];
  for (const [re, to] of rules) if (re.test(w)) return "в " + w.replace(re, to);
  if (/[еиоуыэюё]$/i.test(w)) return "в " + w;
  return "в " + w + "е";
}
export const prepOf = (r: { name: string; namePrep?: string | null }) => r.namePrep || guessPrep(r.name);

// Подборки: адрес /kurort/{курорт}/{фильтр}
export type Collection = { slug: string; title: string; h1: (prep: string) => string; where: Prisma.ListingWhereInput };
const amen = (code: string): Prisma.ListingWhereInput => ({ amenities: { some: { amenity: { code } } } });

export const COLLECTIONS: Collection[] = [
  { slug: "gostevye-doma", title: "Гостевые дома", h1: p => `Гостевые дома ${p}`, where: { type: "GUESTHOUSE" } },
  { slug: "kvartiry", title: "Квартиры", h1: p => `Квартиры посуточно ${p}`, where: { type: "APARTMENT" } },
  { slug: "mini-oteli", title: "Мини-отели", h1: p => `Мини-отели ${p}`, where: { type: "HOTEL" } },
  { slug: "doma", title: "Дома целиком", h1: p => `Дома целиком ${p}`, where: { type: "HOUSE" } },
  { slug: "komnaty", title: "Комнаты", h1: p => `Комнаты посуточно ${p}`, where: { type: "ROOM" } },
  { slug: "hostely", title: "Хостелы", h1: p => `Хостелы ${p}`, where: { type: "HOSTEL" } },
  { slug: "kempingi", title: "Кемпинги", h1: p => `Кемпинги и глэмпинги ${p}`, where: { type: "CAMPING" } },
  { slug: "pervaya-liniya", title: "Первая линия", h1: p => `Жильё на первой линии ${p}`, where: { seaDistance: { lte: 150 } } },
  { slug: "u-morya", title: "До моря 5 минут", h1: p => `Жильё у моря ${p}: до пляжа 5 минут пешком`, where: { seaDistance: { lte: 400 } } },
  { slug: "peschanyy-plyazh", title: "Песчаный пляж", h1: p => `Жильё у песчаного пляжа ${p}`, where: { beachType: { in: ["SAND", "MIXED"] } } },
  { slug: "s-basseynom", title: "С бассейном", h1: p => `Жильё с бассейном ${p}`, where: amen("pool") },
  { slug: "s-detmi", title: "С детьми", h1: p => `Жильё для отдыха с детьми ${p}`, where: amen("kids") },
  { slug: "s-zhivotnymi", title: "С животными", h1: p => `Жильё ${p}, можно с животными`, where: amen("pets") },
  { slug: "s-kuhney", title: "С кухней", h1: p => `Жильё с кухней ${p}`, where: amen("kitchen") },
  { slug: "s-parkovkoy", title: "С парковкой", h1: p => `Жильё с парковкой ${p}`, where: amen("parking") },
  { slug: "s-zavtrakom", title: "С завтраком", h1: p => `Жильё с завтраком ${p}`, where: amen("breakfast") },
  { slug: "s-vidom-na-more", title: "С видом на море", h1: p => `Жильё с видом на море ${p}`, where: amen("sea_view") },
  { slug: "nedorogo", title: "Недорого", h1: p => `Недорогое жильё ${p}`, where: { priceFrom: { gt: 0, lte: 2500 } } },
];
export const collectionBySlug = (s: string) => COLLECTIONS.find(c => c.slug === s);
