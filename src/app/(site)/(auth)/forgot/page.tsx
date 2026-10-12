import { ForgotForm } from "@/components/AuthForms";
export const metadata = { title: "Восстановление пароля" };
export default function Forgot() {
  return <main className="wrap"><div className="authbox"><h1 className="h1">Восстановление пароля</h1><ForgotForm /></div></main>;
}
