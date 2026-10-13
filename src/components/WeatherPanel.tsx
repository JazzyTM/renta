import { getWeather, weatherText } from "@/lib/weather";

const DAY = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

export async function WeatherPanel({ lat, lng, sea, place }: { lat: number; lng: number; sea?: { lat: number; lng: number }; place: string }) {
  const w = await getWeather(lat, lng, sea);
  if (!w) return null;
  return (
    <section className="panel weather" aria-label={`Погода ${place}`}>
      <h2>Погода {place}</h2>
      <div className="w-now">
        <div><b className="num">{w.now > 0 ? "+" : ""}{w.now}°</b><span>воздух, {weatherText(w.code)}</span></div>
        {w.water != null && <div><b className="num">{w.water > 0 ? "+" : ""}{w.water}°</b><span>вода в море</span></div>}
      </div>
      <ul className="w-days">{w.days.map(d => <li key={d.date}><span>{DAY[new Date(d.date + "T12:00:00Z").getUTCDay()]}</span><b className="num">{d.max}°</b><span className="muted num">{d.min}°</span></li>)}</ul>
    </section>
  );
}
