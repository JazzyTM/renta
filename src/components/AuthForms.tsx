"use client";
import { Consent } from "./Consent";
import { Honeypot } from "./Honeypot";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import { login, register, forgot, reset, resendVerify, sendLoginCode, verifyLoginCode } from "@/app/(site)/(auth)/actions";

import type { FormState as S } from "@/lib/form";

// Вход по коду из письма: почта → код → готово. Новая почта — сразу аккаунт.
function CodeLogin({ next, onPassword }: { next: string; onPassword: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, sendAct, sending] = useActionState(sendLoginCode, null as S);
  const [st, act, pending] = useActionState(verifyLoginCode, null as S);
  const [step, setStep] = useState<"email" | "code">("email");
  const [resent, setResent] = useState(0);
  useEffect(() => { if (sent?.ok) setStep("code"); }, [sent]);
  if (step === "email") return (
    <form action={sendAct} className="stack">
      <div className="field"><label htmlFor="c-e">Почта</label><input className="input" id="c-e" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus /></div>
      <Honeypot />
      {sent?.error && <div className="err">{sent.error}</div>}
      <button className="btn wide" disabled={sending}>{sending ? "Отправляем…" : "Получить код"}</button>
      <p className="small muted">Пришлём код на почту. Пароль не нужен, аккаунт создастся сам.</p>
      <button type="button" className="link small" onClick={onPassword}>Войти с паролем</button>
    </form>
  );
  return (
    <form action={act} className="stack">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="email" value={email} />
      <p className="small">Код отправлен на <b>{email}</b>. <button type="button" className="link" onClick={() => setStep("email")}>Изменить</button></p>
      <div className="field"><label htmlFor="c-c">Код из письма</label><input className="input codein" id="c-c" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="••••••" required autoFocus /></div>
      {st?.error && <div className="err">{st.error}</div>}
      <Consent id="c-pd" optional />
      <button className="btn wide" disabled={pending}>Войти</button>
      <div className="row between small">
        <button type="button" className="link" disabled={resent >= 3} onClick={() => { const f = new FormData(); f.set("email", email); setResent(r => r + 1); startTransition(() => sendAct(f)); }}>{resent ? "Отправили ещё раз" : "Прислать код ещё раз"}</button>
        <span className="muted">Письма нет? Проверьте «Спам»</span>
      </div>
    </form>
  );
}

export function LoginForm({ next, code = false }: { next: string; code?: boolean }) {
  const [mode, setMode] = useState<"code" | "password">(code ? "code" : "password");
  if (mode === "code") return <CodeLogin next={next} onPassword={() => setMode("password")} />;
  return <PasswordLogin next={next} onCode={code ? () => setMode("code") : undefined} />;
}

function PasswordLogin({ next, onCode }: { next: string; onCode?: () => void }) {
  const [st, act, pending] = useActionState(login, null as S);
  const [sent, setSent] = useState(false);
  return (
    <form action={act} className="stack">
      <input type="hidden" name="next" value={next} />
      <div className="field"><label htmlFor="l-e">Почта</label><input className="input" id="l-e" name="email" type="email" autoComplete="email" required /></div>
      <div className="field"><label htmlFor="l-p">Пароль</label><input className="input" id="l-p" name="password" type="password" autoComplete="current-password" required /></div>
      {st?.error && <div className="err">{st.error}{st.resend && !sent && <> <button type="button" className="link" onClick={async () => { await resendVerify(st.resend!); setSent(true); }}>Отправить письмо ещё раз</button></>}{sent && " Письмо отправлено."}</div>}
      <button className="btn wide" disabled={pending}>Войти</button>
      <div className="row between small"><Link href="/forgot">Забыли пароль?</Link><Link href={`/register?next=${encodeURIComponent(next)}`}>Регистрация</Link></div>
      {onCode && <button type="button" className="link small" onClick={onCode}>Войти по коду из письма, без пароля</button>}
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [st, act, pending] = useActionState(register, null as S);
  if (st?.ok) return <div className="notice ok">{st.ok}</div>;
  return (
    <form action={act} className="stack">
      <input type="hidden" name="next" value={next} />
      <div className="field"><label htmlFor="r-n">Имя</label><input className="input" id="r-n" name="name" autoComplete="name" required /></div>
      <div className="field"><label htmlFor="r-e">Почта</label><input className="input" id="r-e" name="email" type="email" autoComplete="email" required /></div>
      <div className="field"><label htmlFor="r-p">Пароль</label><input className="input" id="r-p" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
      <label className="check"><input type="checkbox" name="owner" /> Я сдаю жильё</label>
      <Honeypot />
      {st?.error && <div className="err">{st.error}</div>}
      <Consent id="r-pd" />
      <button className="btn wide" disabled={pending}>Зарегистрироваться</button>
      <div className="small">Уже есть аккаунт? <Link href="/login">Войти</Link></div>
    </form>
  );
}

export function ForgotForm() {
  const [st, act, pending] = useActionState(forgot, null as S);
  if (st?.ok) return <div className="notice ok">{st.ok}</div>;
  return (
    <form action={act} className="stack">
      <div className="field"><label htmlFor="f-e">Почта</label><input className="input" id="f-e" name="email" type="email" required /></div>
      <button className="btn wide" disabled={pending}>Отправить ссылку</button>
    </form>
  );
}

export function ResetForm({ t }: { t: string }) {
  const [st, act, pending] = useActionState(reset, null as S);
  return (
    <form action={act} className="stack">
      <input type="hidden" name="t" value={t} />
      <div className="field"><label htmlFor="n-p">Новый пароль</label><input className="input" id="n-p" name="password" type="password" minLength={8} autoComplete="new-password" required /></div>
      {st?.error && <div className="err">{st.error}</div>}
      <button className="btn wide" disabled={pending}>Сохранить пароль</button>
    </form>
  );
}
