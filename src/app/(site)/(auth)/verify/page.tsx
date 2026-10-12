import Link from "next/link";
import { verifyEmail } from "../actions";

export default async function Verify({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = (await searchParams).t;
  const ok = t ? await verifyEmail(t) : false;
  return <main className="wrap"><div className="authbox"><h1 className="h1">{ok ? "Почта подтверждена" : "Ссылка устарела"}</h1>
    {ok ? <Link className="btn" href="/">На главную</Link> : <p>Войдите, и мы отправим новое письмо. <Link href="/login">Войти</Link></p>}</div></main>;
}
