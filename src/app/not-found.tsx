import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Страница не найдена", robots: { index: false } };

// 404: объявление сняли, ссылка устарела или адрес набран с ошибкой
export default function NotFound() {
  return (
    <main className="nf">
      <Link href="/" className="logo nf-logo" aria-label="На главную"><Logo name="наберегу" size={36} /></Link>
      <div className="nf-box">
        <p className="nf-code">404</p>
        <h1 className="h1">Такой страницы нет</h1>
        <p className="muted">Возможно, объявление сняли с публикации или ссылка устарела. Посмотрите другие варианты.</p>
        <div className="nf-acts"><Link className="btn" href="/">На главную</Link><Link className="btn ghost" href="/search">Искать жильё</Link></div>
        <nav className="nf-links" aria-label="Популярные курорты">
          {[["sochi", "Сочи"], ["anapa", "Анапа"], ["gelendzhik", "Геленджик"], ["adler", "Адлер"], ["yalta", "Ялта"], ["evpatoriya", "Евпатория"]].map(([s, n]) => <Link key={s} href={`/kurort/${s}`}>{n}</Link>)}
        </nav>
      </div>
    </main>
  );
}
