import { ResetForm } from "@/components/AuthForms";
export default async function Reset({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  return <main className="wrap"><div className="authbox"><h1 className="h1">Новый пароль</h1><ResetForm t={(await searchParams).t ?? ""} /></div></main>;
}
