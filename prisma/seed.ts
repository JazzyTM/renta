import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AMENITY_GROUPS } from "./data/amenities";
import { RESORT_GEO } from "./data/coords";
import { PAGES, PAGE_STUBS } from "./data/pages";
import { ARTICLES } from "./data/articles";
import { RESORT_TEXTS } from "./data/resort-texts";
import { RESORT_COVERS, DEMO_EXTERIOR, DEMO_ROOMS, DEMO_VIEWS, unsplash } from "../src/lib/stock";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const REGION_SLUGS: Record<string, string> = {
  Сочи: "sochi", Анапа: "anapa", Геленджик: "gelendzhik", Новороссийск: "novorossiysk", Туапсе: "tuapse",
  "Азовское море": "azovskoe-more", Крым: "krym", Абхазия: "abhaziya",
};
const ABKHAZIA = [["Гагра", "gagra"], ["Пицунда", "picunda"], ["Гудаута", "gudauta"], ["Новый Афон", "novyy-afon"], ["Сухум", "suhum"], ["Очамчира", "ochamchira"]];
const POPULAR = ["lazarevskoe", "gelendzhik", "adler", "kabardinka", "anapa", "vityazevo", "arkhipo-osipovka", "golubickaja", "yalta", "evpatoriya"];

async function main() {
  // Курорты: тот же список, что у kudanamore.ru (prisma/data/resorts.csv)
  const rows = readFileSync(join(__dirname, "data/resorts.csv"), "utf8").trim().split("\n").slice(1).map(l => l.split(","));
  const groups = new Map<string, [string, string][]>();
  for (const [, group, name, slug] of rows) {
    if (!slug) continue;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push([name, slug]);
  }
  groups.set("Абхазия", ABKHAZIA as [string, string][]);
  let rSort = 0;
  for (const [group, list] of groups) {
    const region = await db.region.upsert({
      where: { slug: REGION_SLUGS[group] }, update: {},
      create: { name: group, slug: REGION_SLUGS[group], sort: rSort++ },
    });
    let sort = 0;
    for (const [name, slug] of list)
      await db.resort.upsert({ where: { slug }, update: {}, create: { name, slug, regionId: region.id, sort: sort++, isPopular: POPULAR.includes(slug) } });
  }

  // Координаты (погода, карты) и «где» для заголовков — только если поле ещё пустое
  for (const [name, [lat, lng, prep]] of Object.entries(RESORT_GEO)) {
    await db.resort.updateMany({ where: { name, lat: null }, data: { lat, lng } });
    await db.resort.updateMany({ where: { name, namePrep: null }, data: { namePrep: prep } });
  }

  // Обложки курортов: ставим только туда, где фото ещё нет (своё фото из админки не трогаем)
  for (const [slug, id] of Object.entries(RESORT_COVERS))
    await db.resort.updateMany({ where: { slug, coverUrl: null }, data: { coverUrl: unsplash(id, 1200, 800) } });

  let aSort = 0;
  for (const [group, list] of Object.entries(AMENITY_GROUPS))
    for (const [code, name, isFilter] of list)
      await db.amenity.upsert({ where: { code }, update: { name, group }, create: { code, name, group, isFilter: !!isFilter, sort: aSort++ } });

  const email = process.env.SEED_ADMIN_EMAIL || "admin@example.ru";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin12345";
  await db.user.upsert({
    where: { email }, update: {},
    create: { email, name: "Администратор", role: "ADMIN", emailVerified: new Date(), passwordHash: await bcrypt.hash(password, 10) },
  });

  if ((await db.tariff.count()) === 0)
    await db.tariff.createMany({ data: [
      { name: "Старт", description: "Бесплатно, до 3 объявлений", price: 0, periodDays: 365, maxListings: 3, maxPhotos: 15, sort: 0 },
      { name: "Стандарт", description: "До 10 объявлений, статистика, приоритет в выдаче", price: 4900, periodDays: 180, maxListings: 10, maxPhotos: 30, priorityBoost: 1, showStats: true, sort: 1 },
      { name: "Премиум", description: "Без ограничений, высокий приоритет, значок «Рекомендуем»", price: 12900, periodDays: 180, maxListings: 100, maxPhotos: 50, priorityBoost: 3, showStats: true, sort: 2 },
    ]});

  // Служебные страницы: создаём, а заглушки прошлых версий заменяем текстом (правки из админки не трогаем)
  for (const p of PAGES) {
    const cur = await db.page.findUnique({ where: { slug: p.slug } });
    if (!cur) await db.page.create({ data: { slug: p.slug, title: p.title, body: p.body, showInFooter: p.footer } });
    else if (!cur.body.trim() || PAGE_STUBS.includes(cur.body.trim())) await db.page.update({ where: { slug: p.slug }, data: { body: p.body } });
  }
  // Стартовые статьи
  for (const [i, a] of ARTICLES.entries()) {
    if (await db.article.findUnique({ where: { slug: a.slug } })) continue;
    await db.article.create({ data: { slug: a.slug, title: a.title, excerpt: a.excerpt, body: a.body, coverUrl: unsplash(a.cover, 1200, 700), isPublished: true, publishedAt: new Date(Date.now() - i * 86400000) } });
  }
  // Вводные тексты курортов: только пустые
  for (const [slug, seoText] of Object.entries(RESORT_TEXTS))
    await db.resort.updateMany({ where: { slug, OR: [{ seoText: null }, { seoText: "" }] }, data: { seoText } });

  for (const word of ["предоплата на карту до заселения 100%", "переведите всю сумму", "whatsapp.com/", "t.me/"])
    await db.stopWord.upsert({ where: { word }, update: {}, create: { word } });

  if (process.env.SEED_DEMO === "1") await demo();
  console.log(`Готово. Админ: ${email} / ${password}`);
}

// Демо-объявления: хозяин owner@example.ru. Удалить все разом — удалить этого пользователя в админке.
type Demo = [resort: string, title: string, type: "GUESTHOUSE" | "APARTMENT" | "HOTEL" | "HOUSE" | "ROOM", sea: number, price: number, beach: "PEBBLE" | "SAND", amen: string[], street: string];
const DEMO: Demo[] = [
  ["kabardinka", "Гостевой дом «Лаванда»", "GUESTHOUSE", 180, 8100, "PEBBLE", ["ac", "wifi", "kitchen", "parking", "pool", "kids", "bbq"], "ул. Мира, 12"],
  ["gelendzhik", "Апартаменты «Тонкий мыс»", "APARTMENT", 350, 7400, "SAND", ["ac", "wifi", "kitchen", "washer", "balcony", "sea_view"], "ул. Луначарского, 98"],
  ["divnomorsk", "Мини-отель «Корабельная роща»", "HOTEL", 90, 9900, "PEBBLE", ["ac", "wifi", "pool", "breakfast", "parking", "kids", "first_line"], "ул. Короленко, 3"],
  ["dzhanhot", "Дом «Сосновый»", "HOUSE", 600, 14500, "PEBBLE", ["wifi", "kitchen", "parking", "pets", "bbq", "garden"], "ул. Лесная, 7"],
  ["arkhipo-osipovka", "Гостевой дом «Бриз»", "GUESTHOUSE", 250, 4300, "SAND", ["ac", "wifi", "pool", "kids", "shared_kitchen", "parking"], "ул. Школьная, 41"],
  ["lazarevskoe", "Гостевой дом «Магнолия»", "GUESTHOUSE", 300, 5200, "PEBBLE", ["ac", "wifi", "kitchen", "kids", "parking", "playground"], "ул. Победы, 115"],
  ["anapa", "Квартира у Высокого берега", "APARTMENT", 400, 4600, "SAND", ["ac", "wifi", "kitchen", "balcony"], "ул. Набережная, 3"],
  ["adler", "Отель «Имеретинский бриз»", "HOTEL", 150, 8800, "PEBBLE", ["ac", "wifi", "breakfast", "pool", "parking", "first_line"], "ул. Ленина, 219"],
  ["lazarevskoe", "Гостевой дом «У моря»", "GUESTHOUSE", 120, 4800, "PEBBLE", ["ac", "wifi", "shared_kitchen", "first_line", "kids"], "ул. Калараша, 64"],
  ["lazarevskoe", "Квартира с видом на море", "APARTMENT", 450, 5600, "PEBBLE", ["ac", "wifi", "kitchen", "sea_view", "balcony", "washer"], "ул. Тормахова, 2"],
  ["adler", "Гостевой дом «Елена»", "GUESTHOUSE", 500, 4200, "PEBBLE", ["ac", "wifi", "shared_kitchen", "parking", "kids"], "ул. Ульянова, 22"],
  ["adler", "Апартаменты в Сириусе", "APARTMENT", 700, 6900, "PEBBLE", ["ac", "wifi", "kitchen", "pool", "parking", "washer"], "ул. Олимпийская, 15"],
  ["gelendzhik", "Гостевой дом «Аквамарин»", "GUESTHOUSE", 450, 5100, "SAND", ["ac", "wifi", "shared_kitchen", "parking", "bbq"], "ул. Тельмана, 65"],
  ["gelendzhik", "Мини-отель «Золотая бухта»", "HOTEL", 200, 7800, "SAND", ["ac", "wifi", "breakfast", "pool", "kids", "playground"], "ул. Десантная, 1"],
  ["kabardinka", "Апартаменты «Одиссея»", "APARTMENT", 150, 9200, "PEBBLE", ["ac", "wifi", "kitchen", "sea_view", "first_line", "parking"], "ул. Мира, 15"],
  ["anapa", "Гостевой дом «Солнечный»", "GUESTHOUSE", 600, 3800, "SAND", ["ac", "wifi", "pool", "kids", "shared_kitchen", "playground"], "ул. Новороссийская, 76"],
  ["vityazevo", "Гостевой дом «Ракушка»", "GUESTHOUSE", 350, 3900, "SAND", ["ac", "wifi", "pool", "kids", "breakfast", "parking"], "Паралия, 14"],
  ["vityazevo", "Мини-отель «Паралия»", "HOTEL", 250, 6200, "SAND", ["ac", "wifi", "pool", "breakfast", "kids", "animators"], "ул. Черноморская, 9"],
  ["golubickaja", "Дом с бассейном «Хорошее место»", "HOUSE", 800, 11000, "SAND", ["wifi", "kitchen", "pool", "parking", "bbq", "kids"], "ул. Васильковая, 18"],
  ["golubickaja", "Домики «На море и точка»", "GUESTHOUSE", 700, 3000, "SAND", ["ac", "wifi", "pool", "shared_kitchen", "kids"], "ул. Васильковая, 8"],
  ["arkhipo-osipovka", "Отель «Золотая подкова»", "HOTEL", 300, 6400, "SAND", ["ac", "wifi", "breakfast", "pool", "parking"], "ул. Школьная, 97"],
  ["yalta", "Апартаменты на Набережной", "APARTMENT", 200, 8500, "PEBBLE", ["ac", "wifi", "kitchen", "sea_view", "balcony"], "ул. Пушкинская, 4"],
  ["evpatoriya", "Гостевой дом «Ковыль»", "GUESTHOUSE", 300, 3600, "SAND", ["ac", "wifi", "shared_kitchen", "kids", "parking"], "ул. Фрунзе, 28"],
  ["sochi", "Квартира у Морского вокзала", "APARTMENT", 400, 7900, "PEBBLE", ["ac", "wifi", "kitchen", "washer", "sea_view"], "ул. Войкова, 1"],
];
const NAMES = ["Ирина", "Сергей", "Анна", "Дмитрий", "Ольга", "Павел", "Наталья", "Алексей"];
const REVIEWS = [
  "Отличное место, до моря действительно несколько минут пешком. Номер чистый, хозяева приветливые. Приедем ещё!",
  "Всё соответствует фото. Удобная кухня, тихий двор, рядом магазины и кафе.",
  "Отдыхали семьёй с двумя детьми — очень понравилось. Бассейн чистый, есть детская площадка.",
  "Хорошее соотношение цены и качества. Встретили, всё показали, помогли с экскурсиями.",
  "Уютно и спокойно. Немного шумно вечером от кафе неподалёку, но в целом всё отлично.",
];

async function demo() {
  const owner = await db.user.upsert({
    where: { email: "owner@example.ru" }, update: {},
    create: { email: "owner@example.ru", name: "Ирина", role: "OWNER", emailVerified: new Date(), phone: "+7 918 000-00-00", passwordHash: await bcrypt.hash("owner12345", 10) },
  });
  const amen = await db.amenity.findMany();
  let n = 0;
  for (const [i, [resortSlug, title, type, sea, price, beach, codes, street]] of DEMO.entries()) {
    const resort = await db.resort.findUnique({ where: { slug: resortSlug } });
    if (!resort) continue;
    const ext = DEMO_EXTERIOR[i % DEMO_EXTERIOR.length], r1 = DEMO_ROOMS[i % DEMO_ROOMS.length], r2 = DEMO_ROOMS[(i + 3) % DEMO_ROOMS.length], r3 = DEMO_ROOMS[(i + 6) % DEMO_ROOMS.length], view = DEMO_VIEWS[i % DEMO_VIEWS.length];
    // у квартиры обложка — интерьер, у домов и отелей — фасад или двор
    const photos = (type === "APARTMENT" ? [r1, view, r2, r3] : [ext, r1, r2, view, r3]).map((id, sort) => ({ url: unsplash(id, 1600), sort }));
    // точка рядом с центром курорта, чтобы метки на карте не совпадали
    const jitter = (k: number) => ((((i + 1) * 9301 + k * 49297) % 233280) / 233280 - 0.5) * 0.02;
    const existing = await db.listing.findFirst({ where: { title, ownerId: owner.id }, include: { _count: { select: { photos: true } } } });
    if (existing) {
      if (!existing._count.photos) await db.listingPhoto.createMany({ data: photos.map(p => ({ ...p, listingId: existing.id })) });
      if (existing.lat == null && resort.lat != null) await db.listing.update({ where: { id: existing.id }, data: { lat: resort.lat + jitter(1), lng: resort.lng! + jitter(2) } });
      continue;
    }
    const rooms = type === "HOUSE" || type === "APARTMENT" ? [] : [
      { name: "Двухместный номер", guests: 2, count: 4, price: Math.round(price * 0.5 / 100) * 100 },
      { name: "Семейный номер", guests: 4, count: 2, price: Math.round(price * 0.75 / 100) * 100 },
    ];
    const reviews = Array.from({ length: i % 4 }, (_, k) => ({
      authorName: NAMES[(i + k) % NAMES.length], rating: k % 3 === 2 ? 4 : 5, text: REVIEWS[(i + k) % REVIEWS.length], status: "PUBLISHED" as const,
      cleanliness: 5, location: 5 - (k % 2), value: 5, service: 5,
    }));
    const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
    await db.listing.create({ data: {
      ownerId: owner.id, resortId: resort.id, type, title, slug: resortSlug + "-" + Math.random().toString(36).slice(2, 7), seaDistance: sea, beachType: beach,
      priceFrom: Math.round(price * 0.5 / 100) * 100,
      description: `${title} — жильё для отдыха у моря. ${sea <= 200 ? "До пляжа пара минут пешком. " : ""}Чистые номера со всеми удобствами, зелёный двор, рядом магазины, кафе и остановка. Хозяева живут рядом и помогут с любыми вопросами: подскажут, где вкусно поесть и куда съездить на экскурсию.\n\nЭто демонстрационное объявление: так будет выглядеть карточка на сайте.`,
      address: street, contactPhone: "+7 918 000-00-00", contactName: NAMES[i % NAMES.length], maxGuests: type === "HOUSE" ? 8 : 4, baseGuests: 2, extraGuestPrice: 800,
      status: "PUBLISHED", moderation: "APPROVED", verified: i % 3 !== 1, publishedAt: new Date(Date.now() - i * 3600000),
      lat: resort.lat != null ? resort.lat + jitter(1) : null, lng: resort.lng != null ? resort.lng + jitter(2) : null,
      ratingAvg: avg, ratingCount: reviews.length,
      prices: { create: [[5, 0.5], [6, 0.75], [7, 1], [8, 1.05], [9, 0.7], [10, 0.5]].map(([m, f]) => ({ month: m, price: Math.round(price * f / 100) * 100 })) },
      amenities: { create: amen.filter(a => codes.includes(a.code)).map(a => ({ amenityId: a.id })) },
      photos: { create: photos },
      rooms: { create: rooms },
      reviews: { create: reviews },
    }});
    n++;
  }
  console.log(`Демо-объявлений добавлено: ${n}`);
}

main().finally(() => db.$disconnect());
