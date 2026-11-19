"use client";
import { useState } from "react";
import { aiDescribe } from "@/lib/owner-tools";
import { toast } from "./Toaster";

// Кнопка «Написать с помощью AI»: берёт данные объекта и то, что уже написано в поле, и предлагает черновик.
// Текст попадает в поле описания, сохраняет его сам хозяин.
export function AiDescribe({ listingId, field = "description" }: { listingId: string; field?: string }) {
  const [busy, setBusy] = useState(false);
  async function run(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.closest("form");
    const ta = form?.querySelector<HTMLTextAreaElement>(`textarea[name="${field}"]`);
    if (!ta) return;
    if (ta.value.trim().length > 200 && !confirm("Заменить текущее описание черновиком от AI? Старый текст пойдёт в заметки для нейросети.")) return;
    setBusy(true);
    const r: { text?: string; error?: string } = await aiDescribe(listingId, ta.value).catch(() => ({ error: "Не получилось, попробуйте ещё раз" }));
    setBusy(false);
    if (r.error) { toast(r.error, "err"); return; }
    ta.value = r.text ?? "";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.focus();
    toast("Черновик готов. Проверьте текст и нажмите «Сохранить»");
  }
  return (
    <button type="button" className="aibtn" onClick={run} disabled={busy}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4zM18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor" /></svg>
      {busy ? "Пишем черновик…" : "Написать с помощью AI"}
    </button>
  );
}
