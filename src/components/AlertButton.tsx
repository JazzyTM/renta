"use client";
import { useActionState, useEffect, useState } from "react";
import { createAlert } from "@/app/(site)/alerts/actions";
import { Honeypot } from "./Honeypot";

// «Сообщать о новых»: письмо раз в день, если по этому поиску появились объявления
export function AlertButton({ title, email }: { title: string; email?: string }) {
  const [open, setOpen] = useState(false);
  const [st, act, pending] = useActionState(createAlert, null);
  const [path, setPath] = useState("");
  useEffect(() => { if (open) setPath(location.pathname + location.search); }, [open]);
  return (
    <>
      <button type="button" className="chip ico" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 6h16v12H4zM4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
        Сообщать о новых</button>
      {open && <div className="modal-bg" onClick={() => setOpen(false)}><div className="modal" role="dialog" aria-label="Подписка на новые объявления" onClick={e => e.stopPropagation()}>
        <button className="x" aria-label="Закрыть" onClick={() => setOpen(false)}>×</button>
        <h2 className="h2">Новые варианты на почту</h2>
        {st?.ok ? <p>{st.ok}</p> : <form action={act} className="stack" style={{ marginTop: 12 }}><Honeypot />
          <p className="small muted">Поиск «{title}» с выбранными фильтрами. Пишем не чаще раза в день, отписаться можно из письма.</p>
          <input type="hidden" name="path" value={path} /><input type="hidden" name="title" value={title} />
          <div className="field"><label htmlFor="al-email">Почта</label><input className="input" id="al-email" name="email" type="email" defaultValue={email} required /></div>
          {st?.error && <div className="err">{st.error}</div>}
          <button className="btn wide" disabled={pending || !path}>{pending ? "Сохраняем…" : "Подписаться"}</button>
        </form>}
      </div></div>}
    </>
  );
}
