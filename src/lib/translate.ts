import "server-only";
import { getSettings } from "./settings";

// Перевод через Яндекс Переводчик (Yandex Cloud, API v2)
export async function translate(texts: string[], to = "en"): Promise<string[]> {
  const s = await getSettings();
  if (!s.yandexTranslateKey) throw new Error("Не задан ключ Яндекс Переводчика (Настройки → Перевод и рефералы)");
  const res = await fetch("https://translate.api.cloud.yandex.net/translate/v2/translate", {
    method: "POST", signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json", Authorization: `Api-Key ${s.yandexTranslateKey}` },
    body: JSON.stringify({ texts, targetLanguageCode: to, sourceLanguageCode: "ru", ...(s.yandexFolderId ? { folderId: s.yandexFolderId } : {}) }),
  });
  const j = await res.json().catch(() => null) as { translations?: { text: string }[]; message?: string } | null;
  if (!res.ok || !j?.translations) throw new Error(`Переводчик ответил ошибкой: ${j?.message ?? res.status}`);
  return j.translations.map(t => t.text);
}
