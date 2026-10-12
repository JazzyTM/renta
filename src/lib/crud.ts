import "server-only";
import { db } from "./db";

// Описание простых справочников для админки: по нему строятся список, форма и сохранение
export type CrudField = {
  key: string; label: string; type: "text" | "textarea" | "int" | "bool" | "select" | "date" | "rich" | "image";
  required?: boolean; hint?: string; def?: unknown;
  options?: [string, string][] | (() => Promise<[string, string][]>);
};
export type CrudEntity = {
  title: string; one: string; model: string; adminOnly?: boolean;
  fields: CrudField[]; columns: string[]; search?: string[]; orderBy?: object; publicUrl?: (r: any) => string;
  canDelete?: boolean;
};

const regions = async () => (await db.region.findMany({ orderBy: { sort: "asc" } })).map(r => [r.id, r.name] as [string, string]);
const resorts = async () => [["", "Без курорта"], ...(await db.resort.findMany({ orderBy: { name: "asc" } })).map(r => [r.id, r.name] as [string, string])] as [string, string][];
const seo: CrudField[] = [
  { key: "seoTitle", label: "SEO title", type: "text" },
  { key: "seoDescription", label: "SEO description", type: "textarea" },
];

export const CRUD: Record<string, CrudEntity> = {
  regions: { title: "Регионы", one: "регион", model: "region", columns: ["name", "slug", "sort", "isActive"], orderBy: { sort: "asc" }, fields: [
    { key: "name", label: "Название", type: "text", required: true },
    { key: "slug", label: "Адрес (латиницей)", type: "text", required: true },
    { key: "sort", label: "Порядок", type: "int", def: 0 },
    { key: "isActive", label: "Показывать на сайте", type: "bool", def: true },
  ]},
  resorts: { title: "Курорты", one: "курорт", model: "resort", columns: ["name", "slug", "regionId", "isPopular", "isActive"], search: ["name", "slug"], orderBy: [{ region: { sort: "asc" } }, { sort: "asc" }], publicUrl: r => `/kurort/${r.slug}`, fields: [
    { key: "name", label: "Название", type: "text", required: true },
    { key: "namePrep", label: "Где (для заголовков)", type: "text", hint: "Например: в Анапе, в Лазаревском. Пусто — подставится автоматически" },
    { key: "slug", label: "Адрес (латиницей)", type: "text", required: true, hint: "Страница курорта: /kurort/адрес" },
    { key: "regionId", label: "Регион", type: "select", options: regions, required: true },
    { key: "sort", label: "Порядок", type: "int", def: 0 },
    { key: "isActive", label: "Показывать на сайте", type: "bool", def: true },
    { key: "isPopular", label: "Популярный (на главной)", type: "bool" },
    { key: "lat", label: "Широта", type: "text" }, { key: "lng", label: "Долгота", type: "text" },
    { key: "coverUrl", label: "Фото курорта", type: "image", hint: "Для плитки на главной и шапки страницы курорта. Горизонтальное, от 1200 px" },
    ...seo,
    { key: "seoText", label: "SEO-текст внизу страницы курорта", type: "rich" },
  ]},
  seopages: { title: "SEO-подборки", one: "текст подборки", model: "seoPage", columns: ["filter", "resortId", "h1", "isActive"], orderBy: [{ filter: "asc" }], fields: [
    { key: "filter", label: "Подборка", type: "select", required: true, options: async () => (await import("./collections")).COLLECTIONS.map(c => [c.slug, `${c.title} (/${c.slug})`] as [string, string]) },
    { key: "resortId", label: "Курорт", type: "select", options: async () => [["", "Все курорты (шаблон)"], ...(await resorts()).slice(1)] as [string, string][], hint: "Текст для конкретного курорта важнее шаблона" },
    { key: "h1", label: "Заголовок H1", type: "text", hint: "{in} — «в Анапе», {resort} — название. Пусто — стандартный" },
    { key: "seoTitle", label: "SEO title", type: "text" },
    { key: "seoDescription", label: "SEO description", type: "textarea" },
    { key: "text", label: "Текст под списком", type: "rich", hint: "Можно {in} и {resort}" },
    { key: "isActive", label: "Включён", type: "bool", def: true },
  ]},
  amenities: { title: "Удобства и услуги", one: "удобство", model: "amenity", columns: ["name", "group", "code", "isFilter"], search: ["name", "group", "code"], orderBy: [{ sort: "asc" }], fields: [
    { key: "name", label: "Название", type: "text", required: true },
    { key: "group", label: "Группа", type: "text", required: true, hint: "Например: В номере, Территория, Пляж и море" },
    { key: "code", label: "Код (латиницей, уникальный)", type: "text", required: true },
    { key: "isFilter", label: "Показывать в фильтрах поиска", type: "bool" },
    { key: "sort", label: "Порядок", type: "int", def: 0 },
  ]},
  tariffs: { title: "Тарифы", one: "тариф", model: "tariff", adminOnly: true, columns: ["name", "price", "periodDays", "maxListings", "isActive"], orderBy: { sort: "asc" }, fields: [
    { key: "name", label: "Название", type: "text", required: true },
    { key: "description", label: "Описание", type: "textarea" },
    { key: "price", label: "Цена за период, ₽", type: "int", def: 0, hint: "0 — бесплатный тариф" },
    { key: "periodDays", label: "Срок, дней", type: "int", def: 180 },
    { key: "maxListings", label: "Максимум объявлений", type: "int", def: 3 },
    { key: "maxPhotos", label: "Максимум фото в объявлении", type: "int", def: 15 },
    { key: "priorityBoost", label: "Приоритет в выдаче (0–10)", type: "int", def: 0 },
    { key: "showStats", label: "Расширенная статистика", type: "bool" },
    { key: "isActive", label: "Доступен для покупки", type: "bool", def: true },
    { key: "sort", label: "Порядок", type: "int", def: 0 },
  ]},
  promocodes: { title: "Промокоды", one: "промокод", model: "promoCode", adminOnly: true, columns: ["code", "discountPct", "freeDays", "used", "maxUses", "validUntil", "isActive"], search: ["code"], orderBy: { createdAt: "desc" }, fields: [
    { key: "code", label: "Код", type: "text", required: true, hint: "Хранится заглавными буквами" },
    { key: "discountPct", label: "Скидка, %", type: "int", def: 0, hint: "100 — бесплатно" },
    { key: "freeDays", label: "Добавить дней к сроку", type: "int", def: 0 },
    { key: "maxUses", label: "Сколько раз можно применить (0 — без ограничений)", type: "int", def: 0 },
    { key: "validUntil", label: "Действует до", type: "date" },
    { key: "isActive", label: "Активен", type: "bool", def: true },
  ]},
  pages: { title: "Страницы", one: "страницу", model: "page", columns: ["title", "slug", "isPublished", "showInFooter"], orderBy: { title: "asc" }, publicUrl: r => `/p/${r.slug}`, fields: [
    { key: "title", label: "Заголовок", type: "text", required: true },
    { key: "slug", label: "Адрес (латиницей)", type: "text", required: true, hint: "Страница: /p/адрес" },
    { key: "body", label: "Текст", type: "rich", hint: "Пустая строка — новый абзац. ## Заголовок, - пункт списка, [текст](ссылка)" },
    { key: "isPublished", label: "Опубликована", type: "bool", def: true },
    { key: "showInFooter", label: "Ссылка в подвале", type: "bool" },
    ...seo,
  ]},
  articles: { title: "Статьи", one: "статью", model: "article", columns: ["title", "slug", "isPublished", "publishedAt"], search: ["title"], orderBy: { createdAt: "desc" }, publicUrl: r => `/articles/${r.slug}`, fields: [
    { key: "title", label: "Заголовок", type: "text", required: true },
    { key: "slug", label: "Адрес (латиницей)", type: "text", required: true },
    { key: "excerpt", label: "Кратко (для списка)", type: "textarea" },
    { key: "body", label: "Текст", type: "rich", hint: "Пустая строка — новый абзац. ## Заголовок, - пункт списка, [текст](ссылка)" },
    { key: "coverUrl", label: "Фото курорта", type: "image", hint: "Для плитки на главной и шапки страницы курорта. Горизонтальное, от 1200 px" },
    { key: "resortId", label: "Курорт", type: "select", options: resorts },
    { key: "isPublished", label: "Опубликована", type: "bool" },
    { key: "publishedAt", label: "Дата публикации", type: "date" },
    ...seo,
  ]},
  banners: { title: "Баннеры", one: "баннер", model: "banner", columns: ["title", "place", "isActive", "endsAt"], orderBy: { sort: "asc" }, fields: [
    { key: "title", label: "Заголовок", type: "text", required: true },
    { key: "text", label: "Текст", type: "textarea" },
    { key: "link", label: "Ссылка", type: "text" },
    { key: "place", label: "Где показывать", type: "select", options: [["home", "Главная"], ["search", "Поиск и курорты"], ["listing", "Страница объекта"]], def: "home" },
    { key: "isActive", label: "Включён", type: "bool", def: true },
    { key: "startsAt", label: "Показывать с", type: "date" },
    { key: "endsAt", label: "Показывать до", type: "date" },
    { key: "sort", label: "Порядок", type: "int", def: 0 },
  ]},
  stopwords: { title: "Стоп-слова", one: "стоп-слово", model: "stopWord", columns: ["word", "action"], search: ["word"], orderBy: { word: "asc" }, fields: [
    { key: "word", label: "Слово или фраза", type: "text", required: true },
    { key: "action", label: "Что делать", type: "select", options: [["flag", "Отправить на проверку"], ["block", "Не давать публиковать"]], def: "flag" },
  ]},
  redirects: { title: "Редиректы", one: "редирект", model: "redirect", adminOnly: true, columns: ["from", "to", "permanent"], search: ["from", "to"], orderBy: { from: "asc" }, fields: [
    { key: "from", label: "Откуда (путь, например /old-page)", type: "text", required: true },
    { key: "to", label: "Куда", type: "text", required: true },
    { key: "permanent", label: "Постоянный (301)", type: "bool", def: true },
  ]},
  beaches: { title: "Пляжи", one: "пляж", model: "beach", columns: ["name", "resortId", "type"], search: ["name"], orderBy: { name: "asc" }, fields: [
    { key: "name", label: "Название", type: "text", required: true },
    { key: "resortId", label: "Курорт", type: "select", options: async () => (await resorts()).slice(1), required: true },
    { key: "type", label: "Тип", type: "select", options: [["PEBBLE", "галька"], ["SAND", "песок"], ["MIXED", "песок и галька"]], def: "PEBBLE" },
    { key: "lat", label: "Широта", type: "text", required: true }, { key: "lng", label: "Долгота", type: "text", required: true },
  ]},
};

export async function fieldOptions(f: CrudField) {
  return typeof f.options === "function" ? await f.options() : f.options ?? [];
}

const NULLABLE = new Set(["seoTitle", "seoDescription", "seoText", "coverUrl", "resortId", "link", "namePrep", "h1"]);

// FormData → данные для Prisma
export function parseFields(fields: CrudField[], fd: FormData) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = fd.get(f.key);
    const v = raw == null ? "" : String(raw).trim();
    if (f.type === "bool") out[f.key] = raw === "on";
    else if (f.type === "int") out[f.key] = parseInt(v, 10) || 0;
    else if (f.type === "date") out[f.key] = v ? new Date(v + "T00:00:00Z") : null;
    else if (["lat", "lng"].includes(f.key)) out[f.key] = v ? Number(v.replace(",", ".")) : null;
    else out[f.key] = v === "" && NULLABLE.has(f.key) ? null : v;
    if (f.required && (out[f.key] === "" || out[f.key] == null)) throw new Error(`Заполните поле «${f.label}»`);
  }
  if ("code" in out && typeof out.code === "string" && out.code && fields.some(f => f.key === "discountPct")) out.code = (out.code as string).toUpperCase();
  return out;
}

export const delegate = (model: string) => (db as any)[model];
