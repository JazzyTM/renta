"use client";
import { useState, useTransition } from "react";
import { publish } from "@/lib/listing-actions";

export function PublishButton({ id }: { id: string }) {
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="stack" style={{ gap: 6 }}>
      <button className="btn sm" disabled={pending} onClick={() => start(async () => setMsg(await publish(id)))}>Опубликовать</button>
      {msg?.error && <span className="err">{msg.error}</span>}
      {msg?.ok && <span className="small" style={{ color: "var(--ok)" }}>{msg.ok}</span>}
    </div>
  );
}
