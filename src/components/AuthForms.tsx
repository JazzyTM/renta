"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register, forgot, reset, resendVerify } from "@/app/(site)/(auth)/actions";

import type { FormState as S } from "@/lib/form";

export function LoginForm({ next }: { next: string }) {
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
      <label className="check small"><input type="checkbox" name="agree" required /> <span>Принимаю <Link href="/p/offer">соглашение</Link> и <Link href="/p/privacy">политику обработки данных</Link></span></label>
      {st?.error && <div className="err">{st.error}</div>}
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
