// Миниатюра фото: для своих загрузок — файл «-t.webp», для стоковых Unsplash — та же ссылка шириной 640
// (если в ссылке задана высота с обрезкой, она уменьшается пропорционально).
export function thumb(url: string) {
  if (url.endsWith(".webp") && url.startsWith("/uploads/")) return url.replace(/\.webp$/, "-t.webp");
  if (!url.startsWith("https://images.unsplash.com/")) return url;
  const w = Number(url.match(/[?&]w=(\d+)/)?.[1] || 0);
  let out = url.replace(/([?&])w=\d+/, "$1w=640");
  if (w > 640) out = out.replace(/([?&])h=(\d+)/, (_, p: string, h: string) => `${p}h=${Math.round(Number(h) * 640 / w)}`);
  return out;
}
