import { db } from "./db";

type Field = { key: string; label: string; type: "text" | "textarea" | "number" | "bool" | "password" | "select" | "image"; def: unknown; hint?: string; options?: [string, string][] };
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
    { key: "footerTagline", label: "Подпись под логотипом в подвале", type: "text", def: "Жильё у моря напрямую от хозяев" },
    { key: "socialVk", label: "Группа ВКонтакте (ссылка)", type: "text", def: "" },
    { key: "socialTelegram", label: "Канал в Telegram (ссылка)", type: "text", def: "" },
    { key: "socialYoutube", label: "YouTube или Дзен (ссылка)", type: "text", def: "" },
    { key: "maintenance", label: "Режим обслуживания (сайт закрыт для посетителей)", type: "bool", def: false },
    { key: "maintenanceText", label: "Текст на время обслуживания", type: "text", def: "Сайт обновляется, зайдите через несколько минут." },
  ]},
  { id: "home", title: "Главная", fields: [
    { key: "heroImage", label: "Фото в шапке главной", type: "image", def: "", hint: "Море или берег, горизонтальное, от 1920 px. Без фото шапка будет однотонной" },
    { key: "featuresShow", label: "Показывать блок «Почему мы»", type: "bool", def: true },
    { key: "feature1Title", label: "Почему мы, пункт 1", type: "text", def: "Проверенные объявления" },
    { key: "feature1Text", label: "Текст пункта 1", type: "textarea", def: "Проверяем объявления и хозяев. Жалобы разбираем в течение дня." },
    { key: "feature2Title", label: "Пункт 2", type: "text", def: "Без посредников и комиссий" },
    { key: "feature2Text", label: "Текст пункта 2", type: "textarea", def: "Звоните или пишите хозяину напрямую. Мы не берём комиссию с гостей." },
    { key: "feature3Title", label: "Пункт 3", type: "text", def: "Большой выбор" },
    { key: "feature3Text", label: "Текст пункта 3", type: "textarea", def: "Гостевые дома, квартиры и мини-отели на курортах Чёрного и Азовского моря. Сейчас вариантов: {count}." },
    { key: "bannerShow", label: "Показывать баннер для хозяев", type: "bool", def: true },
    { key: "bannerImage", label: "Фото баннера для хозяев", type: "image", def: "" },
    { key: "bannerTitle", label: "Заголовок баннера", type: "text", def: "Сдаёте жильё у моря?" },
    { key: "bannerText", label: "Текст баннера", type: "text", def: "Разместите объявление, гости будут звонить вам напрямую." },
    { key: "homeSeoText", label: "Текст внизу главной", type: "textarea", def: "", hint: "Можно разметку: ## заголовок, **жирный**, [ссылка](/адрес)" },
  ]},
  { id: "seo", title: "SEO и счётчики", fields: [
    { key: "seoTitle", label: "Title главной", type: "text", def: "Жильё у моря без посредников — снять посуточно" },
    { key: "seoDescription", label: "Description главной", type: "textarea", def: "Гостевые дома, квартиры и отели у моря напрямую от хозяев." },
    { key: "resortTitleTpl", label: "Шаблон title курорта", type: "text", def: "Снять жильё {in} у моря посуточно, без посредников", hint: "{in} заменится на «в Анапе», {resort} на название" },
    { key: "collectionTitleTpl", label: "Шаблон title подборки", type: "text", def: "{h1}: цены, фото, телефоны хозяев", hint: "{h1} заменится на заголовок подборки" },
    { key: "seoMinListings", label: "Подборка попадает в поиск, если в ней объявлений не меньше", type: "number", def: 2 },
    { key: "metrikaId", label: "Номер счётчика Яндекс Метрики", type: "text", def: "" },
    { key: "yandexVerification", label: "Код подтверждения Яндекс Вебмастера", type: "text", def: "" },
    { key: "googleVerification", label: "Код подтверждения Google", type: "text", def: "" },
    { key: "robotsExtra", label: "Дополнительные строки robots.txt", type: "textarea", def: "" },
  ]},
  { id: "listings", title: "Объявления и модерация", fields: [
    { key: "postModeration", label: "Публиковать сразу, проверять после (постмодерация)", type: "bool", def: true },
    { key: "maxPhotos", label: "Максимум фото в объявлении", type: "number", def: 30 },
    { key: "photoMaxSize", label: "Фото уменьшаются до, px по длинной стороне", type: "number", def: 2000 },
    { key: "photoQuality", label: "Качество сжатия фото (60–95)", type: "number", def: 82 },
    { key: "watermark", label: "Ставить водяной знак на фото", type: "bool", def: false, hint: "Действует для новых фото" },
    { key: "watermarkText", label: "Текст водяного знака", type: "text", def: "", hint: "Пусто — название сайта" },
    { key: "watermarkOpacity", label: "Прозрачность знака, % видимости", type: "number", def: 55 },
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
  { id: "translate", title: "Перевод и рефералы", fields: [
    { key: "yandexTranslateKey", label: "Яндекс Переводчик: API-ключ", type: "password", def: "", hint: "Yandex Cloud → сервисный аккаунт → API-ключ с ролью ai.translate.user. Нужен для кнопки «Перевести на английский» в объявлении" },
    { key: "yandexFolderId", label: "Яндекс Переводчик: ID каталога", type: "text", def: "", hint: "Можно не заполнять, если ключ сервисного аккаунта" },
    { key: "referralOn", label: "Приглашения хозяев включены", type: "bool", def: true },
    { key: "referralDays", label: "Бонус за приглашённого хозяина, дней тарифа", type: "number", def: 30, hint: "Начисляется, когда приглашённый опубликует первое объявление" },
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
    { key: "githubToken", label: "GitHub токен (для приватного репозитория, только чтение)", type: "password", def: "", hint: "Пусто: берётся токен, указанный при установке" },
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
