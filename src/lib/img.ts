// Уменьшенная копия фото для карточек и миниатюр. У старых фото (до сжатия) её нет.
export const thumb = (url: string) => (url.endsWith(".webp") && url.startsWith("/uploads/") ? url.replace(/\.webp$/, "-t.webp") : url);
