import { getSettings } from "@/lib/settings";

export async function Social({ next }: { next: string }) {
  const s = await getSettings();
  const vk = s.vkEnabled && (s.vkClientId || process.env.VK_CLIENT_ID);
  const ya = s.yandexEnabled && (s.yandexClientId || process.env.YANDEX_CLIENT_ID);
  if (!vk && !ya) return null;
  const q = `?next=${encodeURIComponent(next)}`;
  return (
    <>
      <div className="social">
        {vk && <a className="btn ghost wide" href={`/auth/vk${q}`}>Войти через ВКонтакте</a>}
        {ya && <a className="btn ghost wide" href={`/auth/yandex${q}`}>Войти через Яндекс ID</a>}
      </div>
      <div className="or">или по почте</div>
    </>
  );
}
