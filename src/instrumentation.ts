// Запускается один раз при старте сервера
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" && process.env.TELEGRAM_POLL !== "0") {
    const { startTelegramPolling } = await import("./lib/telegram-poll");
    startTelegramPolling();
  }
}
