// Миниатюра фото: для своих загрузок — файл «-t.webp», для стоковых Unsplash — та же ссылка меньшей ширины
export const thumb = (url: string) =>
  url.endsWith(".webp") && url.startsWith("/uploads/") ? url.replace(/\.webp$/, "-t.webp") :
  url.startsWith("https://images.unsplash.com/") ? url.replace(/([?&])w=\d+/, "$1w=640") :
  url;
