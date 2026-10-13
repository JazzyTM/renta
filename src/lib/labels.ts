export const LISTING_TYPES: Record<string, string> = {
  GUESTHOUSE: "Гостевой дом", APARTMENT: "Квартира / апартаменты", HOTEL: "Мини-отель", HOUSE: "Дом целиком",
  ROOM: "Комната", HOSTEL: "Хостел", CAMPING: "Кемпинг / глэмпинг",
};
export const BEACH_TYPES: Record<string, string> = { PEBBLE: "галька", SAND: "песок", MIXED: "песок и галька" };
export const LISTING_STATUS: Record<string, [string, string]> = {
  DRAFT: ["Черновик", "plain"], PUBLISHED: ["Опубликован", "ok"], HIDDEN: ["Скрыт", "plain"], BLOCKED: ["Заблокирован", "bad"], ARCHIVED: ["В архиве", "plain"],
};
export const MODERATION: Record<string, [string, string]> = {
  PENDING: ["На проверке", "warn"], APPROVED: ["Проверен", "ok"], REJECTED: ["Отклонён", "bad"], CHANGES_REQUESTED: ["Нужны правки", "warn"],
};
export const BOOKING_STATUS: Record<string, [string, string]> = {
  NEW: ["Новая", "warn"], ACCEPTED: ["Подтверждена, ждёт предоплату", "accent"], PREPAID: ["Предоплата получена", "ok"],
  DECLINED: ["Отклонена", "bad"], CANCELLED: ["Отменена", "plain"], COMPLETED: ["Завершена", "plain"], NO_RESPONSE: ["Нет ответа", "bad"],
};
export const ROLES: Record<string, string> = { GUEST: "Гость", OWNER: "Владелец", MODERATOR: "Модератор", ADMIN: "Администратор" };
export const REVIEW_STATUS: Record<string, [string, string]> = { PENDING: ["На проверке", "warn"], PUBLISHED: ["Опубликован", "ok"], HIDDEN: ["Скрыт", "plain"] };
export const COMPLAINT_STATUS: Record<string, [string, string]> = { OPEN: ["Новая", "warn"], IN_PROGRESS: ["В работе", "accent"], RESOLVED: ["Решена", "ok"], REJECTED: ["Отклонена", "plain"] };
export const PREPAY: Record<string, string> = { NONE: "Без предоплаты", NIGHT: "1 сутки", PERCENT: "Процент от суммы" };
export const LEGAL_FORMS: Record<string, string> = { SELF_EMPLOYED: "Самозанятый", IP: "ИП", PERSON: "Физлицо", COMPANY: "Юрлицо" };
export const PROMO_TYPES: Record<string, string> = { BOOST: "Поднятие", HIGHLIGHT: "Выделение", FEATURED: "На главной курорта", TOP: "Закреп вверху" };
export const AUD: Record<string, string> = { owners: "Хозяева (есть объявления)", guests: "Гости (без объявлений)", all: "Все пользователи", staff: "Только сотрудники (проверка)" };
export const TPL_NAMES: Record<string, string> = {
  verify_email: "Подтверждение почты", password_reset: "Восстановление пароля", booking_new_owner: "Хозяину: новая заявка",
  booking_accepted_guest: "Гостю: даты подтверждены", booking_declined_guest: "Гостю: заявка отклонена", booking_message: "Новое сообщение в заявке", search_alert: "Гостю: новые варианты по подписке", id_checked: "Хозяину: результат проверки личности",
  listing_rejected: "Хозяину: объявление нужно поправить", listing_approved: "Хозяину: объявление проверено",
};

// Оценки по пунктам в отзывах
export const CRIT: [("cleanliness" | "location" | "value" | "service"), string][] = [["cleanliness", "Чистота"], ["location", "Расположение"], ["value", "Цена и качество"], ["service", "Хозяин и сервис"]];
