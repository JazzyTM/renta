import "server-only";
import { tgApi, handleUpdate } from "./telegram";

// Long polling: сервер сам забирает сообщения боту. Один процесс сайта — один опрос.
const g = globalThis as unknown as { __tgPoll?: boolean };

export function startTelegramPolling() {
  if (g.__tgPoll) return;
  g.__tgPoll = true;
  let offset = 0;
  let cleared = "";
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  (async () => {
    await sleep(5000);
    for (;;) {
      try {
        const { getSettings } = await import("./settings");
        const s = await getSettings();
        const tok = s.telegramOn ? String(s.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || "") : "";
        if (!tok) { await sleep(30_000); continue; }
        // при смене токена снимаем вебхук, иначе getUpdates не работает
        if (cleared !== tok) { await tgApi("deleteWebhook", {}, { tok }).catch(() => {}); cleared = tok; offset = 0; }
        const ups = await tgApi<any[]>("getUpdates", { offset, timeout: 50, allowed_updates: ["message"] }, { tok, timeoutMs: 60_000 });
        for (const u of ups ?? []) {
          offset = u.update_id + 1;
          await handleUpdate(u).catch(e => console.error("[telegram] update", (e as Error).message));
        }
      } catch (e) {
        console.error("[telegram] poll", (e as Error).message);
        await sleep(15_000);
      }
    }
  })();
}
