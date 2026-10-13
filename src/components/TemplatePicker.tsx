"use client";
import { useEffect, useRef } from "react";

// Кнопки шаблонов: подставляют текст в последнее поле, где был курсор (по умолчанию — сообщение в переписке)
export function TemplatePicker({ list, vars }: { list: { id: string; title: string; text: string }[]; vars: Record<string, string> }) {
  const last = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  useEffect(() => {
    const on = (e: FocusEvent) => { const t = e.target as HTMLElement; if (t.matches("textarea, input[name=text]")) last.current = t as HTMLTextAreaElement; };
    document.addEventListener("focusin", on); return () => document.removeEventListener("focusin", on);
  }, []);
  if (!list.length) return <p className="small muted">Частые ответы можно сохранить в <a href="/cabinet/templates">шаблонах</a>.</p>;
  function put(text: string) {
    const v = text.replace(/\{(\S+?)\}/g, (m, k) => vars[k] ?? m);
    const el = last.current ?? document.getElementById("chat-text") as HTMLTextAreaElement | null;
    if (!el) return;
    el.value = el.value.trim() ? el.value.trimEnd() + "\n" + v : v;
    el.focus();
  }
  return (
    <div className="qchips wrapchips" aria-label="Шаблоны ответов">
      <span className="small muted">Шаблоны:</span>
      {list.map(t => <button type="button" key={t.id} className="chip" onMouseDown={e => e.preventDefault()} onClick={() => put(t.text)}>{t.title}</button>)}
      <a className="small" href="/cabinet/templates">изменить</a>
    </div>
  );
}
