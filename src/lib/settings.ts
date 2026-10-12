import { db } from "./db";

type Field = { key: string; label: string; type: "text" | "textarea" | "number" | "bool" | "password" | "select"; def: unknown; hint?: string; options?: [string, string][] };
type Section = { id: string; title: string; fields: Field[] };

// Все настройки сайта. Админка строит формы по этому описанию.
export const SETTINGS: Section[] = [
  { id: "general", title: "Общие", fields: [
    { key: "siteName", label: "Название сайта", type: "text", def: "Берег" },
    { key: "tagline", label: "Заголовок на главной", type: "text", def: "Жильё у моря без посредников" },
    { key: "subTagline", label: "Подзаголовок на главной", type: "text", def: "Черноморское и Азовское побережье, Крым, Абхазия" },
    { key: "contactEmail", label: "Почта для связи", type: "text", def: "" },
    { key: "contactPhone", label: "Телефон поддержки", type: "text", def: "" },
    { key: "footerText", label: "Текст в подвале", type: "textarea", def: "" },
    { key: "maintenance", label: "Режим обслуживания (сайт закрыт для посетителей)", type: "bool", def: false },
    { key: "maintenanceText", label: "Текст на время обслуживания", type: "text", def: "Сайт обновляется, зайдите через несколько минут." },
  ]},
  { id: "seo", title: "SEO и счётчики", fields: [
    { key: "seoTitle", label: "Title главной", type: "text", def: "Жильё у моря без посредников — снять посуточно" },
    { key: "seoDescription", label: "Description главной", type: "textarea", def: "Гостевые дома, квартиры и отели у моря напрямую от хозяев." },
    { key: "resortTitleTpl", label: "Шаблон title курорта", type: "text", def: "Снять жильё в {resort} у моря посуточно", hint: "{resort} заменится на название" },
    { key: "metrikaId", label: "Номер счётчика Яндекс Метрики", type: "text", def: "" },
    { key: "yandexVerification", label: "Код подтверждения Яндекс Вебмастера", type: "text", def: "" },
    { key: "googleVerification", label: "Код подтверждения Google", type: "text", def: "" },
    { key: "robotsExtra", label: "Дополнительные строки robots.txt", type: "textarea", def: "" },
  ]},
  { id: "listings", title: "Объявления и модерация", fields: [
    { key: "postModeration", label: "Публиковать сразу, проверять после (постмодерация)", type: "bool", def: true },
    { key: "maxPhotos", label: "Максимум фото в объявлении", type: "number", def: 30 },
    { key: "minPhotos", label: "Минимум фото для публикации", type: "number", def: 3 },
    { key: "minDescription", label: "Минимальная длина описания", type: "number", def: 100 },
    { key: "maxListingsFree", label: "Объявлений на владельца без тарифа", type: "number", def: 3 },
    { key: "stopWordsAction", label: "Если найдены стоп-слова", type: "select", def: "flag", options: [["flag", "Отправить на проверку"], ["block", "Не давать публиковать"]] },
    { key: "pageSize", label: "Объявлений на странице поиска", type: "number", def: 20 },
  ]},
  { id: "contacts", title: "Связь с хозяевами и заявки", fields: [
    { key: "showPhone", label: "Показывать телефон хозяина", type: "bool", def: true },
    { key: "phoneNeedsLogin", label: "Телефон только для вошедших", type: "bool", def: false },
    { key: "bookingRequests", label: "Принимать заявки с датами", type: "bool", def: true },
    { key: "guestNeedsLogin", label: "Заявка только для вошедших", type: "bool", def: false },
    { key: "responseHours", label: "Через сколько часов считать, что хозяин не ответил", type: "number", def: 24 },
    { key: "reviewsOnlyAfterStay", label: "Отзывы только после заявки", type: "bool", def: true },
    { key: "reviewsPremoderation", label: "Отзывы публиковать после проверки", type: "bool", def: true },
  ]},
  { id: "auth", title: "Регистрация и вход", fields: [
    { key: "registrationOpen", label: "Регистрация открыта", type: "bool", def: true },
    { key: "requireEmailVerify", label: "Требовать подтверждение почты", type: "bool", def: true },
    { key: "vkEnabled", label: "Вход через ВКонтакте (VK ID)", type: "bool", def: false },
    { key: "vkClientId", label: "VK ID: ID приложения", type: "text", def: "" },
    { key: "vkClientSecret", label: "VK ID: защищённый ключ", type: "password", def: "" },
    { key: "yandexEnabled", label: "Вход через Яндекс ID", type: "bool", def: false },
    { key: "yandexClientId", label: "Яндекс ID: ClientID", type: "text", def: "" },
    { key: "yandexClientSecret", label: "Яндекс ID: Client secret", type: "password", def: "" },
  ]},
  { id: "mail", title: "Почта", fields: [
    { key: "smtpHost", label: "SMTP сервер", type: "text", def: "", hint: "Пусто: письма не отправляются, а пишутся в журнал писем" },
    { key: "smtpPort", label: "SMTP порт", type: "number", def: 465 },
    { key: "smtpUser", label: "SMTP логин", type: "text", def: "" },
    { key: "smtpPass", label: "SMTP пароль", type: "password", def: "" },
    { key: "smtpFrom", label: "Отправитель", type: "text", def: "Берег <no-reply@example.ru>" },
    { key: "adminNotifyEmail", label: "Куда слать уведомления администрации", type: "text", def: "" },
  ]},
  { id: "payments", title: "Оплата и монетизация", fields: [
    { key: "onlinePayments", label: "Онлайн-оплата предоплаты на сайте", type: "bool", def: false, hint: "Пока выключено: гости платят хозяину напрямую" },
    { key: "paymentProvider", label: "Платёжный сервис", type: "select", def: "none", options: [["none", "Не подключён"]] },
    { key: "paymentShopId", label: "ID магазина", type: "text", def: "" },
    { key: "paymentSecret", label: "Секретный ключ", type: "password", def: "" },
    { key: "commissionPct", label: "Комиссия сервиса с брони, %", type: "number", def: 0 },
    { key: "freePlacementUntil", label: "Бесплатное размещение до (ГГГГ-ММ-ДД)", type: "text", def: "2027-09-30", hint: "До этой даты тарифы не нужны. Пусто: бесплатного периода нет" },
    { key: "freeMaxListings", label: "Объявлений на владельца в бесплатный период", type: "number", def: 20 },
    { key: "freePromotions", label: "Платные услуги бесплатно в бесплатный период", type: "bool", def: false },
    { key: "boostPrice", label: "Цена поднятия, ₽", type: "number", def: 199 },
    { key: "highlightPrice", label: "Цена выделения на 7 дней, ₽", type: "number", def: 299 },
    { key: "featuredPrice", label: "Цена «на главной курорта» на 7 дней, ₽", type: "number", def: 990 },
    { key: "topPrice", label: "Цена закрепа вверху выдачи на 7 дней, ₽", type: "number", def: 1490 },
  ]},
  { id: "updates", title: "Обновления", fields: [
    { key: "githubRepo", label: "Репозиторий с кодом", type: "text", def: "JazzyTM/renta" },
    { key: "githubBranch", label: "Ветка", type: "text", def: "main" },
    { key: "githubToken", label: "GitHub токен (для приватного репозитория, только чтение)", type: "password", def: "" },
    { key: "autoUpdate", label: "Ставить обновления автоматически ночью", type: "bool", def: false },
  ]},
];

const DEFAULTS: Record<string, unknown> = Object.fromEntries(SETTINGS.flatMap(s => s.fields.map(f => [f.key, f.def])));

export type Settings = typeof DEFAULTS & Record<string, any>;

let cache: { at: number; data: Record<string, unknown> } | null = null;

export async function getSettings(): Promise<Record<string, any>> {
  if (cache && Date.now() - cache.at < 10_000) return cache.data;
  const rows = await db.setting.findMany();
  const data = { ...DEFAULTS, ...Object.fromEntries(rows.map(r => [r.key, r.value])) };
  cache = { at: Date.now(), data };
  return data;
}

export async function saveSettings(values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values))
    await db.setting.upsert({ where: { key }, create: { key, value: value as any }, update: { value: value as any } });
  cache = null;
}
