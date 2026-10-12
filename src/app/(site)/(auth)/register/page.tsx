import { RegisterForm } from "@/components/AuthForms";
import { Social } from "@/components/Social";

export const metadata = { title: "Регистрация" };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next ?? "/";
  return <main className="wrap"><div className="authbox"><h1 className="h1">Регистрация</h1><Social next={next} /><RegisterForm next={next} /></div></main>;
}
