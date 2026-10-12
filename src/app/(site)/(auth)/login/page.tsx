import { LoginForm } from "@/components/AuthForms";
import { Social } from "@/components/Social";

export const metadata = { title: "Вход" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next ?? "/";
  return <main className="wrap"><div className="authbox"><h1 className="h1">Вход</h1>
    {sp.error && <div className="notice bad">Не получилось войти через соцсеть. Попробуйте ещё раз или войдите по почте.</div>}
    <Social next={next} /><LoginForm next={next} /></div></main>;
}
