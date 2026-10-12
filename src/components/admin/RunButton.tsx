"use client";
import { useState, useTransition } from "react";
import type { FormState } from "@/lib/form";

export function RunButton({ action, children, confirmText, className = "btn" }: { action: () => Promise<FormState>; children: React.ReactNode; confirmText?: string; className?: string }) {
  const [st, set] = useState<FormState>(null);
  const [pending, start] = useTransition();
  return (
    <span className="stack" style={{ gap: 6 }}>
      <button className={className} disabled={pending} onClick={() => { if (confirmText && !confirm(confirmText)) return; start(async () => set(await action())); }}>{pending ? "…" : children}</button>
      {st?.error && <span className="err">{st.error}</span>}
      {st?.ok && <span className="small" style={{ color: "var(--ok)" }}>{st.ok}</span>}
    </span>
  );
}
