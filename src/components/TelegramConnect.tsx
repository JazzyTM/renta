import { botEnabled, botUsername, linkCode } from "@/lib/telegram";
import { telegramUnlink } from "@/app/(site)/account/actions";

// Подключение уведомлений в Telegram: ссылка на бота с кодом, после «Старт» чат привязывается к аккаунту
export async function TelegramConnect({ user, title = "Уведомления в Telegram" }: { user: { id: string; telegramChatId: string | null; telegramName: string | null }; title?: string }) {
  if (!(await botEnabled())) return null;
  const bot = await botUsername();
  if (!bot) return null;
  return (
    <section className="card-box stack tgbox">
      <div className="row between">
        <b>{title}</b>
        {user.telegramChatId && <span className="tag ok">Подключено{user.telegramName ? `: ${user.telegramName}` : ""}</span>}
      </div>
      {user.telegramChatId ? (
        <>
          <p className="small muted">Новые заявки, сообщения и ответы приходят в Telegram сразу. Письма на почту тоже продолжают приходить.</p>
          <div className="row">
            <a className="btn ghost sm" href={`https://t.me/${bot}`} target="_blank" rel="noopener">Открыть бота</a>
            <form action={telegramUnlink}><button className="btn ghost sm">Отключить</button></form>
          </div>
        </>
      ) : (
        <>
          <p className="small muted">Получайте новые заявки и сообщения гостей в Telegram — отвечать можно быстрее, чем по почте.</p>
          <div className="row">
            <a className="btn sm" href={`https://t.me/${bot}?start=${linkCode(user.id)}`} target="_blank" rel="noopener">Подключить Telegram</a>
          </div>
          <p className="small muted">Откроется бот @{bot}. Нажмите «Старт» — и обновите эту страницу.</p>
        </>
      )}
    </section>
  );
}
