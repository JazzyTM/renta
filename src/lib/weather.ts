import "server-only";

// Погода и температура воды с Open-Meteo (бесплатно, без ключа). Держим в памяти 3 часа.
type Day = { date: string; max: number; min: number; code: number };
export type Weather = { now: number; code: number; water: number | null; days: Day[] };
const cache = new Map<string, { t: number; v: Weather | null }>();

export const weatherText = (c: number) =>
  c === 0 ? "ясно" : c <= 2 ? "малооблачно" : c === 3 ? "пасмурно" : c <= 48 ? "туман" : c <= 57 ? "морось" : c <= 67 ? "дождь" : c <= 77 ? "снег" : c <= 82 ? "ливень" : c <= 86 ? "снегопад" : "гроза";

async function get(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export async function getWeather(lat: number, lng: number, sea?: { lat: number; lng: number }): Promise<Weather | null> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < 3 * 3600000) return hit.v;
  let v: Weather | null = null;
  try {
    const q = `latitude=${lat}&longitude=${lng}&timezone=Europe%2FMoscow`;
    const [f, m] = await Promise.all([
      get(`https://api.open-meteo.com/v1/forecast?${q}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=5`),
      get(`https://marine-api.open-meteo.com/v1/marine?latitude=${sea?.lat ?? lat}&longitude=${sea?.lng ?? lng}&timezone=Europe%2FMoscow&hourly=sea_surface_temperature&forecast_days=1`).catch(() => null),
    ]);
    const hour = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Moscow" }).slice(0, 13).replace(" ", "T");
    const ht: string[] = m?.hourly?.time ?? [], hv: (number | null)[] = m?.hourly?.sea_surface_temperature ?? [];
    const i = Math.max(0, ht.findIndex(t => t.startsWith(hour)));
    const water = hv[i] ?? hv.find(x => x != null) ?? null;
    v = {
      now: Math.round(f.current.temperature_2m), code: f.current.weather_code, water: water == null ? null : Math.round(water),
      days: (f.daily.time as string[]).map((date, j) => ({ date, max: Math.round(f.daily.temperature_2m_max[j]), min: Math.round(f.daily.temperature_2m_min[j]), code: f.daily.weather_code[j] })),
    };
  } catch { v = null; }
  // при ошибке пробуем снова через 15 минут
  cache.set(key, { t: v ? Date.now() : Date.now() - (3 * 3600000 - 15 * 60000), v: v ?? hit?.v ?? null });
  return v ?? hit?.v ?? null;
}
