"use client";
import { useState } from "react";

// Поле картинки в формах админки: превью, замена файлом, удаление
export function ImageField({ name, label, value, hint }: { name: string; label: string; value: string; hint?: string }) {
  const [preview, setPreview] = useState(value);
  const [del, setDel] = useState(false);
  return (
    <div className="field">
      <label htmlFor={`f-${name}`}>{label}</label>
      <input type="hidden" name={name} value={value} />
      {preview && !del && <img src={preview} alt="" className="imgfield-prev" />}
      <input className="input" id={`f-${name}`} name={`${name}__file`} type="file" accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={e => { const f = e.target.files?.[0]; if (f) { setPreview(URL.createObjectURL(f)); setDel(false); } }} />
      {value && <label className="check small"><input type="checkbox" name={`${name}__del`} checked={del} onChange={e => setDel(e.target.checked)} /> Убрать фото</label>}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
