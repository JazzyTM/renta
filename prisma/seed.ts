import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AMENITY_GROUPS } from "./data/amenities";

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

  const pages: [string, string, string][] = [
    ["about", "О сервисе", "Сервис помогает найти жильё у моря напрямую у хозяев."],
    ["rules", "Правила размещения", "1. Объявление должно описывать реальный объект.\n2. Фото должны быть сделаны в этом объекте.\n3. Цены указываются честно, без скрытых доплат."],
    ["privacy", "Политика обработки персональных данных", "Текст политики в соответствии с 152-ФЗ."],
    ["offer", "Пользовательское соглашение", "Текст оферты."],
    ["owners", "Хозяевам", "Как разместить объект и получать заявки."],
  ];
  for (const [slug, title, body] of pages)
    await db.page.upsert({ where: { slug }, update: {}, create: { slug, title, body, showInFooter: true } });

  for (const word of ["предоплата на карту до заселения 100%", "переведите всю сумму", "whatsapp.com/", "t.me/"])
    await db.stopWord.upsert({ where: { word }, update: {}, create: { word } });

  if (process.env.SEED_DEMO === "1") await demo();
  console.log(`Готово. Админ: ${email} / ${password}`);
}

async function demo() {
  const owner = await db.user.upsert({
    where: { email: "owner@example.ru" }, update: {},
    create: { email: "owner@example.ru", name: "Ирина", role: "OWNER", emailVerified: new Date(), phone: "+7 918 000-00-00", passwordHash: await bcrypt.hash("owner12345", 10) },
  });
  const items: [string, string, "GUESTHOUSE" | "APARTMENT" | "HOTEL" | "HOUSE" | "ROOM", number, number, "PEBBLE" | "SAND", string[]][] = [
    ["kabardinka", "Гостевой дом «Лаванда»", "GUESTHOUSE", 180, 8100, "PEBBLE", ["ac", "wifi", "kitchen", "parking", "pool", "kids"]],
    ["gelendzhik", "Апартаменты «Тонкий мыс»", "APARTMENT", 350, 7400, "SAND", ["ac", "wifi", "kitchen", "washer"]],
    ["divnomorsk", "Мини-отель «Корабельная роща»", "HOTEL", 90, 9900, "PEBBLE", ["ac", "wifi", "pool", "breakfast", "parking", "kids"]],
    ["dzhanhot", "Дом «Сосновый»", "HOUSE", 600, 14500, "PEBBLE", ["wifi", "kitchen", "parking", "pets", "bbq"]],
    ["arkhipo-osipovka", "Гостевой дом «Бриз»", "GUESTHOUSE", 250, 4300, "SAND", ["ac", "wifi", "pool", "kids", "shared_kitchen"]],
    ["lazarevskoe", "Гостевой дом «Магнолия»", "GUESTHOUSE", 300, 5200, "PEBBLE", ["ac", "wifi", "kitchen", "kids", "parking"]],
    ["anapa", "Квартира у Высокого берега", "APARTMENT", 400, 4600, "SAND", ["ac", "wifi", "kitchen"]],
    ["adler", "Отель «Имеретинский бриз»", "HOTEL", 150, 8800, "PEBBLE", ["ac", "wifi", "breakfast", "pool", "parking"]],
  ];
  const amen = await db.amenity.findMany();
  for (const [resortSlug, title, type, sea, price, beach, codes] of items) {
    const resort = await db.resort.findUnique({ where: { slug: resortSlug } });
    if (!resort) continue;
    const slug = resortSlug + "-" + Math.random().toString(36).slice(2, 7);
    if (await db.listing.findFirst({ where: { title } })) continue;
    await db.listing.create({ data: {
      ownerId: owner.id, resortId: resort.id, type, title, slug, seaDistance: sea, beachType: beach, priceFrom: Math.round(price * 0.5),
      description: "Уютное жильё недалеко от моря. Чисто, тихо, удобно добираться до пляжа и магазинов. Хозяева живут рядом и помогут с любыми вопросами.",
      address: `${resort.name}, ул. Морская, 1`, contactPhone: "+7 918 000-00-00", contactName: "Ирина", maxGuests: 4, baseGuests: 2, extraGuestPrice: 800,
      status: "PUBLISHED", moderation: "APPROVED", verified: true, publishedAt: new Date(),
      prices: { create: [[6, 0.75], [7, 1], [8, 1.05], [9, 0.7], [5, 0.5], [10, 0.5]].map(([m, f]) => ({ month: m, price: Math.round(price * f / 100) * 100 })) },
      amenities: { create: amen.filter(a => codes.includes(a.code)).map(a => ({ amenityId: a.id })) },
    }});
  }
}

main().finally(() => db.$disconnect());
