"use client";
import { useActionState } from "react";

import type { FormState as S } from "@/lib/form";

// Обёртка для форм с серверным действием: показывает ошибку или «Сохранено»
export function ActionForm({ action, children, submit = "Сохранить", className = "stack" }: { action: (s: S, fd: FormData) => Promise<S>; children: React.ReactNode; submit?: string; className?: string }) {
  const [st, act, pending] = useActionState(action, null);
  return (
    <form action={act} className={className}>
      {children}
      {st?.error && <div className="err">{st.error}</div>}
      {st?.ok && <div className="notice ok">{st.ok}</div>}
      <div><button className="btn" disabled={pending}>{pending ? "Сохраняем…" : submit}</button></div>
    </form>
  );
}

export function ConfirmButton({ children, message = "Точно?", className = "btn ghost sm" }: { children: React.ReactNode; message?: string; className?: string }) {
  return <button className={className} onClick={e => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}
