"use client";
import { toast } from "./Toaster";

export function CopyField({ value }: { value: string }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <input className="input" readOnly value={value} onFocus={e => e.target.select()} style={{ flex: 1 }} />
      <button type="button" className="btn" onClick={() => navigator.clipboard?.writeText(value).then(() => toast("Ссылка скопирована"))}>Копировать</button>
    </div>
  );
}
