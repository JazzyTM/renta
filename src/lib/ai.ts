import "server-only";
import { getSettings } from "./settings";

// Текстовая нейросеть для помощников (описание объявления). Два варианта:
//  - YandexGPT (Yandex Cloud Foundation Models) — работает из России, оплата в рублях;
//  - любой сервис с OpenAI-совместимым API (адрес, ключ и модель задаются в настройках).
// Провайдер и ключ: «Админка → Настройки → AI-помощник».

export async function aiEnabled() {
  const s = await getSettings();
  return s.aiProvider !== "none" && !!s.aiKey && (s.aiProvider !== "yandex" || !!s.aiFolderId) && (s.aiProvider !== "openai" || !!s.aiBaseUrl);
}

export async function complete(system: string, user: string, maxTokens = 1200): Promise<string> {
  const s = await getSettings();
  if (!(await aiEnabled())) throw new Error("AI-помощник не настроен");
  const key = String(s.aiKey);
  if (s.aiProvider === "yandex") {
    const model = String(s.aiModel || "yandexgpt-lite/latest");
    const res = await fetch("https://llm.api.cloud.yandex.net/foundationModels/v1/completion", {
      method: "POST", signal: AbortSignal.timeout(60000),
      headers: { "Content-Type": "application/json", Authorization: `Api-Key ${key}`, "x-folder-id": String(s.aiFolderId) },
      body: JSON.stringify({
        modelUri: `gpt://${s.aiFolderId}/${model}`,
        completionOptions: { stream: false, temperature: 0.5, maxTokens: String(maxTokens) },
        messages: [{ role: "system", text: system }, { role: "user", text: user }],
      }),
    });
    const j = await res.json().catch(() => null) as { result?: { alternatives?: { message?: { text?: string } }[] }; message?: string; error?: { message?: string } } | null;
    const text = j?.result?.alternatives?.[0]?.message?.text;
    if (!res.ok || !text) throw new Error(`YandexGPT ответил ошибкой: ${j?.error?.message ?? j?.message ?? res.status}`);
    return text.trim();
  }
  const base = String(s.aiBaseUrl).replace(/\/+$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST", signal: AbortSignal.timeout(60000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: String(s.aiModel || ""), temperature: 0.5, max_tokens: maxTokens, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  const j = await res.json().catch(() => null) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } } | null;
  const text = j?.choices?.[0]?.message?.content;
  if (!res.ok || !text) throw new Error(`Нейросеть ответила ошибкой: ${j?.error?.message ?? res.status}`);
  return text.trim();
}
