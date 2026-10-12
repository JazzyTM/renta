"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { thumb } from "@/lib/img";
import { reorderPhotos, deletePhoto } from "@/lib/listing-actions";
import { toast } from "./Toaster";

type Photo = { id: string; url: string };
type Up = { key: string; name: string; progress: number; error?: string; preview: string };

export function PhotoManager({ listingId, photos: initial, max }: { listingId: string; photos: Photo[]; max: number }) {
  const [photos, setPhotos] = useState(initial);
  const [ups, setUps] = useState<Up[]>([]);
  const [over, setOver] = useState(false);
  const drag = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [, start] = useTransition();

  function upload(file: File) {
    const key = Math.random().toString(36).slice(2);
    setUps(u => [...u, { key, name: file.name, progress: 0, preview: URL.createObjectURL(file) }]);
    return new Promise<void>(done => {
      const x = new XMLHttpRequest();
      const fd = new FormData(); fd.append("photo", file);
      x.upload.onprogress = e => e.lengthComputable && setUps(u => u.map(p => p.key === key ? { ...p, progress: Math.round(e.loaded / e.total * 100) } : p));
      x.onload = () => {
        let r: { id?: string; url?: string; error?: string } = {};
        try { r = JSON.parse(x.responseText); } catch { r = { error: "Ошибка сервера" }; }
        if (r.id) { setPhotos(p => [...p, { id: r.id!, url: r.url! }]); setUps(u => u.filter(p => p.key !== key)); }
        else { setUps(u => u.map(p => p.key === key ? { ...p, error: r.error } : p)); toast(`${file.name}: ${r.error}`, "err"); }
        done();
      };
      x.onerror = () => { setUps(u => u.map(p => p.key === key ? { ...p, error: "Нет связи" } : p)); done(); };
      x.open("POST", `/api/photos/${listingId}`); x.send(fd);
    });
  }

  async function addFiles(list: FileList | File[]) {
    const files = Array.from(list).filter(f => /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name));
    const room = max - photos.length;
    if (files.length > room) toast(`Можно добавить ещё ${room} фото`, "err");
    for (const f of files.slice(0, Math.max(0, room))) await upload(f); // по одному, чтобы не перегружать сервер
    router.refresh();
  }

  function drop(to: number) {
    const from = drag.current; drag.current = null;
    if (from == null || from === to) return;
    const next = [...photos]; const [m] = next.splice(from, 1); next.splice(to, 0, m);
    setPhotos(next);
    start(async () => { await reorderPhotos(listingId, next.map(p => p.id)); toast("Порядок сохранён"); });
  }
  function move(i: number, d: number) { drag.current = i; drop(i + d); }
  function remove(p: Photo) {
    if (!confirm("Удалить фото?")) return;
    setPhotos(x => x.filter(y => y.id !== p.id));
    start(async () => { await deletePhoto(listingId, p.id); toast("Фото удалено"); });
  }

  return (
    <div className="stack">
      <div className="pgrid">
        {photos.map((p, i) => (
          <div key={p.id} className="pcell" draggable onDragStart={() => (drag.current = i)} onDragOver={e => e.preventDefault()} onDrop={() => drop(i)}>
            <img src={thumb(p.url)} alt="" />
            {i === 0 && <span className="tag accent pcover">Обложка</span>}
            <div className="pbar">
              <button type="button" aria-label="Левее" disabled={i === 0} onClick={() => move(i, -1)}>←</button>
              <button type="button" aria-label="Правее" disabled={i === photos.length - 1} onClick={() => move(i, 1)}>→</button>
              <button type="button" aria-label="Удалить" onClick={() => remove(p)}>✕</button>
            </div>
          </div>
        ))}
        {ups.map(u => (
          <div key={u.key} className="pcell up">
            <img src={u.preview} alt="" />
            <div className="pprog">{u.error ? <span className="err">{u.error}</span> : <><i style={{ width: `${u.progress}%` }} /><span>{u.progress < 100 ? `${u.progress}%` : "Обработка…"}</span></>}</div>
          </div>
        ))}
        {photos.length < max && (
          <button type="button" className={`pdrop ${over ? "over" : ""}`} onClick={() => input.current?.click()}
            onDragOver={e => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { if (e.dataTransfer.files.length) { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); } }}>
            <b>+ Добавить фото</b><span className="small muted">или перетащите сюда</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,.heic" multiple hidden onChange={e => e.target.files && addFiles(e.target.files)} />
      <span className="hint">{photos.length} из {max}. Перетащите фото, чтобы поменять порядок; первое станет обложкой. Фото сжимаются автоматически.</span>
    </div>
  );
}
