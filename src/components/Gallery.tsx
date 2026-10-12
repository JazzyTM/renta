"use client";
import { thumb } from "@/lib/img";
import { useCallback, useEffect, useRef, useState } from "react";

type Photo = { url: string; caption: string | null };

// Фото объявления: сетка на компьютере, листание на телефоне, просмотр на весь экран
export function Gallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [cur, setCur] = useState(0);
    const n = photos.length;
  const go = useCallback((d: number) => setOpen(i => i === null ? i : (i + d + n) % n), [n]);

  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    document.addEventListener("keydown", k);
    const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [open, go]);

  // Свайп в полноэкранном режиме
  const x0 = useRef<number | null>(null);
  const touch = { onTouchStart: (e: React.TouchEvent) => { x0.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => { if (x0.current === null) return; const dx = e.changedTouches[0].clientX - x0.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); x0.current = null; } };

  if (!n) return null;
  return (
    <>
      <div className="gal">
        <div className="gal-grid" data-n={Math.min(n, 5)}>
          {photos.slice(0, 5).map((p, i) => (
            <button type="button" key={p.url} onClick={() => setOpen(i)} aria-label={`Открыть фото ${i + 1}`}>
              <img src={i ? thumb(p.url) : p.url} alt={p.caption || (i ? "" : title)} loading={i ? "lazy" : "eager"} />
            </button>
          ))}
        </div>
        <div className="gal-strip" onScroll={e => setCur(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {photos.map((p, i) => <button type="button" key={p.url} onClick={() => setOpen(i)}><img src={thumb(p.url)} alt={p.caption || ""} loading={i ? "lazy" : "eager"} /></button>)}
        </div>
        <span className="gal-count hide-lg num">{cur + 1} / {n}</span>
        {n > 1 && <button type="button" className="gal-all" onClick={() => setOpen(0)}>Все фото · {n}</button>}
      </div>
      {open !== null && (
        <div className="lb" role="dialog" aria-modal="true" aria-label="Фотографии" {...touch}>
          <div className="lb-top"><span className="num">{open + 1} / {n}</span><button type="button" onClick={() => setOpen(null)} aria-label="Закрыть">✕</button></div>
          <div className="lb-main" onClick={e => { if (e.target === e.currentTarget) setOpen(null); }}>
            {n > 1 && <button type="button" className="lb-nav prev" onClick={() => go(-1)} aria-label="Предыдущее">‹</button>}
            <figure><img src={photos[open].url} alt={photos[open].caption || ""} />{photos[open].caption && <figcaption>{photos[open].caption}</figcaption>}</figure>
            {n > 1 && <button type="button" className="lb-nav next" onClick={() => go(1)} aria-label="Следующее">›</button>}
          </div>
          {n > 1 && <div className="lb-thumbs">{photos.map((p, i) => <button type="button" key={p.url} className={i === open ? "on" : ""} onClick={() => setOpen(i)}><img src={thumb(p.url)} alt="" loading="lazy" /></button>)}</div>}
        </div>
      )}
    </>
  );
}
