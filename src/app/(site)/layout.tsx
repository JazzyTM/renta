import Link from "next/link";
import Script from "next/script";
import { getUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { LogoMark } from "@/components/Logo";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [s, user] = await Promise.all([getSettings(), getUser()]);
  if (s.maintenance && !isStaff(user?.role))
    return <main className="wrap" style={{ paddingBlock: 80, textAlign: "center" }}><h1 className="h1">{s.siteName}</h1><p className="muted" style={{ marginTop: 12 }}>{s.maintenanceText}</p></main>;
  const pages = await db.page.findMany({ where: { isPublished: true, showInFooter: true }, select: { slug: true, title: true } });
  return (
    <>
      <header className="top"><div className="wrap">
        <Link href="/" className="logo"><LogoMark />{s.siteName.toLowerCase()}</Link>
        <nav>
          <Link className="navlink" href="/search">Поиск</Link>
          {user ? <>
            <Link className="navlink" href="/my">Мои поездки</Link>
            <Link className="navlink" href="/cabinet">Сдать жильё</Link>
            {isStaff(user.role) && <Link className="navlink" href="/admin">Админка</Link>}
            <Link className="navlink" href="/account">{user.name || "Профиль"}</Link>
          </> : <>
            <Link className="navlink" href="/cabinet">Сдать жильё</Link>
            <Link className="btn sm" href="/login">Войти</Link>
          </>}
        </nav>
      </div></header>
      {children}
      <footer className="foot"><div className="wrap">
        <span>© {new Date().getFullYear()} {s.siteName}{s.contactEmail ? ` · ${s.contactEmail}` : ""}{s.contactPhone ? ` · ${s.contactPhone}` : ""}</span>
        <span className="row">{pages.map(p => <Link key={p.slug} href={`/p/${p.slug}`}>{p.title}</Link>)}<Link href="/articles">Статьи</Link></span>
        {s.footerText && <span style={{ flexBasis: "100%" }}>{s.footerText}</span>}
      </div></footer>
      {s.metrikaId && <Script id="ym" strategy="afterInteractive">{`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${Number(s.metrikaId)},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}</Script>}
    </>
  );
}
