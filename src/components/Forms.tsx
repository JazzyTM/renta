"use client";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "./Toaster";

import type { FormState as S } from "@/lib/form";

// Обёртка для форм с серверным действием: показывает ошибку или «Сохранено»
export function ActionForm({ action, children, submit = "Сохранить", className = "stack" }: { action: (s: S, fd: FormData) => Promise<S>; children: React.ReactNode; submit?: string; className?: string }) {
  const [st, act, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (st?.ok) { toast(st.ok); ref.current?.dispatchEvent(new CustomEvent("form-ok", { bubbles: true })); } }, [st]);
  return (
    <form action={act} className={className} ref={ref}>
      {children}
      {st?.error && <div className="err" role="alert">{st.error}</div>}
      <div><button className="btn" disabled={pending}>{pending ? <><span className="spin" /> Сохраняем</> : submit}</button></div>
    </form>
  );
}

export function ConfirmButton({ children, message = "Точно?", className = "btn ghost sm" }: { children: React.ReactNode; message?: string; className?: string }) {
  return <button className={className} onClick={e => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}
