"use client";
// Поиск на карте (Яндекс Карты JS API 2.1). Скрипт грузится только при открытии карты — бережём суточный лимит ключа.
import { useEffect, useRef, useState } from "react";
import type { MapPoint } from "@/lib/queries";
import { LISTING_TYPES } from "@/lib/labels";
import { rub, plural, score10 } from "@/lib/format";
import { thumb } from "@/lib/img";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { ymaps?: any; __ymapsLoading?: Promise<any> } }

function loadYmaps(key: string) {
  if (window.ymaps?.Map) return Promise.resolve(window.ymaps);
  if (!window.__ymapsLoading) window.__ymapsLoading = new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
    s.onload = () => window.ymaps.ready(() => ok(window.ymaps));
    s.onerror = () => { window.__ymapsLoading = undefined; fail(new Error("load")); };
    document.head.appendChild(s);
  });
  return window.__ymapsLoading;
}

const short = (n: number) => n >= 10000 ? `${Math.round(n / 1000)} тыс` : n.toLocaleString("ru-RU");

export function MapView({ apiKey, query, title, center, onClose }: { apiKey: string; query: URLSearchParams; title: string; center?: [number, number]; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const layer = useRef<any>(null);
  const [points, setPoints] = useState<MapPoint[] | null>(null);
  const [sel, setSel] = useState<MapPoint | null>(null);
  const [moved, setMoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  // Кружок группы: список его объявлений и область, чтобы приблизить
  const [group, setGroup] = useState<{ pts: MapPoint[]; bounds: number[][] } | null>(null);

  const fetchPoints = async (bbox?: number[]) => {
    const p = new URLSearchParams(query); p.set("_map", "1");
    if (bbox) p.set("bbox", bbox.map(x => x.toFixed(5)).join(","));
    setBusy(true);
    try { const r = await fetch(`/api/search?${p}`).then(r => r.json()); setPoints(r.points ?? []); return r.points as MapPoint[]; }
    finally { setBusy(false); }
  };

  // Карта: создаём один раз
  useEffect(() => {
    let dead = false;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    Promise.all([loadYmaps(apiKey), fetchPoints()]).then(([ym, pts]) => {
      if (dead || !box.current) return;
      const m = new ym.Map(box.current, { center: center ?? [44.6, 37.9], zoom: 13, controls: [] }, { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true });
      m.controls.add("zoomControl", { size: "small", position: { right: 10, top: 90 } });
      m.controls.add("geolocationControl", { position: { right: 10, top: 40 } });
      map.current = m;
      m.options.set("maxZoom", 17); // ближе — уже отдельные дома, объекты не видны
      // «Искать в этой области» — только когда карту сдвинул сам человек
      const listen = () => { if (!dead) m.events.add("actionend", () => setMoved(true)); };
      if (pts.length) m.setBounds(ym.util.bounds.fromPoints(pts.map(x => [x.lat, x.lng])), { checkZoomRange: true, zoomMargin: 60 }).then(() => { if (m.getZoom() > 16) m.setZoom(16); setTimeout(listen, 400); });
      else listen();
      m.events.add("click", () => { setSel(null); setGroup(null); });
      setReady(true);
    }).catch(() => !dead && setErr("Карта не загрузилась. Проверьте интернет или попробуйте позже."));
    return () => { dead = true; document.body.style.overflow = ""; window.removeEventListener("keydown", esc); map.current?.destroy(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Метки с ценой; рядом стоящие собираются в кружок с числом. Пересоздаём только при новых точках.
  const marks = useRef(new Map<string, any>());
  useEffect(() => {
    const ym = window.ymaps, m = map.current;
    if (!ready || !ym || !m || !points) return;
    if (layer.current) m.geoObjects.remove(layer.current);
    marks.current.clear();
    const Pin = ym.templateLayoutFactory.createClass('<div class="mpin{% if properties.on %} on{% endif %}">$[properties.label]</div>');
    const cl = new ym.Clusterer({ clusterIconLayout: ym.templateLayoutFactory.createClass('<div class="mclu">{{ properties.geoObjects.length }}</div>'), clusterIconShape: { type: "Circle", coordinates: [0, 0], radius: 24 }, groupByCoordinates: false, gridSize: 72, clusterDisableClickZoom: true, hasBalloon: false, zoomMargin: 60 });
    cl.add(points.map(pt => {
      const pm = new ym.Placemark([pt.lat, pt.lng], { label: `${short(pt.price)} ₽`, on: false }, { iconLayout: Pin, iconShape: { type: "Rectangle", coordinates: [[-40, -38], [40, 0]] }, hasBalloon: false, hasHint: false, zIndex: 100 });
      pm.properties.set("pid", pt.id);
      pm.events.add("click", (e: any) => { e.stopPropagation(); setGroup(null); setSel(pt); });
      marks.current.set(pt.id, pm);
      return pm;
    }));
    const byId = new Map(points.map(pt => [pt.id, pt]));
    cl.events.add("click", (e: any) => {
      const objs = e.get("target")?.getGeoObjects?.();
      if (!objs) return;
      const pts = objs.map((o: any) => byId.get(o.properties.get("pid"))).filter(Boolean).sort((a: MapPoint, b: MapPoint) => a.price - b.price);
      setSel(null);
      setGroup({ pts, bounds: ym.util.bounds.fromPoints(pts.map((x: MapPoint) => [x.lat, x.lng])) });
    });
    m.geoObjects.add(cl); layer.current = cl;
  }, [points, ready]);

  // Выбор метки: меняем только её вид, без перерисовки остальных
  useEffect(() => {
    for (const [id, pm] of marks.current) {
      const on = sel?.id === id;
      if (pm.properties.get("on") !== on) { pm.properties.set("on", on); pm.options.set("zIndex", on ? 1000 : 100); }
    }
  }, [sel, points]);

  const searchHere = async () => {
    const b = map.current?.getBounds(); if (!b) return;
    setMoved(false); setSel(null); setGroup(null);
    await fetchPoints([b[0][0], b[0][1], b[1][0], b[1][1]]);
  };

  const n = points?.length ?? 0;
  return (
    <div className="mapview" role="dialog" aria-modal="true" aria-label="Поиск на карте">
      <div className="mv-top">
        <div><b>{title}</b><span className="small muted">{points === null ? "Загружаем…" : n ? `${n} ${plural(n, ["вариант", "варианта", "вариантов"])} на карте` : "В этой области ничего нет"}</span></div>
        <button type="button" className="btn ghost sm" onClick={onClose}>Списком</button>
      </div>
      <div className="mv-map" ref={box}>{err && <p className="mv-err">{err}</p>}</div>
      {moved && <button type="button" className="mv-here" onClick={searchHere} disabled={busy}>{busy ? "Ищем…" : "Искать в этой области"}</button>}
      {group && <div className="mv-list" role="region" aria-label="Варианты в этом месте">
        <div className="mvl-h">
          <b>{group.pts.length} {plural(group.pts.length, ["вариант", "варианта", "вариантов"])} здесь</b>
          <button type="button" className="link" onClick={() => { map.current?.setBounds(group.bounds, { checkZoomRange: true, zoomMargin: 80 }); setGroup(null); }}>Приблизить</button>
          <button type="button" className="mv-x" aria-label="Закрыть" onClick={() => setGroup(null)}>×</button>
        </div>
        <div className="mvl-items">{group.pts.map(pt => <a key={pt.id} className="mvl-it" href={pt.href} target="_blank" rel="noopener">
          {pt.photo ? <img src={thumb(pt.photo)} alt="" loading="lazy" /> : <span className="mv-noph" />}
          <span className="mv-t">
            <b>{pt.title}</b>
            <span className="small muted">{LISTING_TYPES[pt.type]}{pt.sea != null ? ` · ${pt.sea} м до моря` : ""}{pt.reviews ? <>{" · "}<span style={{ whiteSpace: "nowrap" }}>★ {score10(pt.rating)}</span></> : ""}</span>
            <span className="mv-p">от <b>{rub(pt.price)}</b> за ночь</span>
          </span>
        </a>)}</div>
      </div>}
      {sel && <a className="mv-card" href={sel.href} target="_blank" rel="noopener">
        {sel.photo ? <img src={thumb(sel.photo)} alt="" /> : <span className="mv-noph" />}
        <span className="mv-t">
          <b>{sel.title}</b>
          <span className="small muted">{LISTING_TYPES[sel.type]}{sel.sea != null ? ` · ${sel.sea} м до моря` : ""}{sel.reviews ? <>{" · "}<span style={{ whiteSpace: "nowrap" }}>★ {score10(sel.rating)}</span></> : ""}</span>
          <span className="mv-p">от <b>{rub(sel.price)}</b> за ночь</span>
        </span>
        <button type="button" className="mv-x" aria-label="Закрыть" onClick={e => { e.preventDefault(); setSel(null); }}>×</button>
      </a>}
    </div>
  );
}
