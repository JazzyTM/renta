"use client";
import { Honeypot } from "./Honeypot";
import { useActionState, useState } from "react";
import type { FormState } from "@/lib/form";
import { complain } from "@/app/(site)/obj/[number]/actions";

const REASONS = ["Объявление не соответствует действительности", "Мошенничество или требование полной предоплаты", "Неверный телефон", "Объект уже не сдаётся", "Другое"];

export function ComplaintForm({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(complain, null as FormState);
  if (state?.ok) return <p className="small muted">Спасибо, жалоба отправлена модераторам.</p>;
  if (!open) return <button className="link small" style={{ justifySelf: "start" }} onClick={() => setOpen(true)}>Пожаловаться на объявление</button>;
  return (
    <form action={action} className="card-box stack"><Honeypot />
      <input type="hidden" name="listingId" value={listingId} />
      <div className="field"><label htmlFor="c-r">Причина</label><select className="input" id="c-r" name="reason">{REASONS.map(r => <option key={r}>{r}</option>)}</select></div>
      <div className="field"><label htmlFor="c-t">Подробности</label><textarea className="input" id="c-t" name="text" /></div>
      <div className="field"><label htmlFor="c-e">Почта для ответа</label><input className="input" id="c-e" name="email" type="email" /></div>
      {state?.error && <div className="err">{state.error}</div>}
      <button className="btn" disabled={pending}>Отправить</button>
    </form>
  );
}
