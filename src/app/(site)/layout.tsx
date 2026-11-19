import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ViewTransition } from "react";
import Script from "next/script";
import { getUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { FavSync } from "@/components/Fav";
import { CompareBar } from "@/components/Compare";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [s, user] = await Promise.all([getSettings(), getUser()]);
  if (s.maintenance && !isStaff(user?.role))
    return <main className="wrap" style={{ paddingBlock: 80, textAlign: "center" }}><h1 className="h1">{s.siteName}</h1><p className="muted" style={{ marginTop: 12 }}>{s.maintenanceText}</p></main>;
  const favIds = user ? (await db.favorite.findMany({ where: { userId: user.id }, select: { listingId: true } })).map(f => f.listingId) : null;
  const [pages, regions] = await Promise.all([
    db.page.findMany({ where: { isPublished: true, showInFooter: true }, select: { slug: true, title: true } }),
    db.region.findMany({ where: { isActive: true }, orderBy: { sort: "asc" }, select: { name: true, resorts: { where: { isActive: true }, orderBy: { name: "asc" }, select: { name: true, slug: true } } } }),
  ]);
  // Подвал: страницы раскладываются по колонкам, юридические — в нижнюю строку
  const OWNER_PAGES = ["owners", "rules"], DOC_PAGES = ["privacy", "offer", "consent"];
  const ownerPages = pages.filter(p => OWNER_PAGES.includes(p.slug));
  const docPages = pages.filter(p => DOC_PAGES.includes(p.slug));
  const guestPages = pages.filter(p => !OWNER_PAGES.includes(p.slug) && !DOC_PAGES.includes(p.slug));
  const allResorts = regions.flatMap(r => r.resorts);
  const popular = ["sochi", "anapa", "gelendzhik", "adler", "yalta", "evpatoriya", "alushta", "gagra"].map(x => allResorts.find(r => r.slug === x)).filter(r => !!r);
  const socials = [["socialVk", "ВКонтакте", "VK"], ["socialTelegram", "Telegram", "TG"], ["socialYoutube", "YouTube", "▶"]].filter(([k]) => s[k]);
  return (
    <>
      <Header user={user ? { name: user.name, email: user.email, staff: isStaff(user.role) } : null} siteName={s.siteName} social={{ vk: !!(s.vkEnabled && (s.vkClientId || process.env.VK_CLIENT_ID)), ya: !!(s.yandexEnabled && (s.yandexClientId || process.env.YANDEX_CLIENT_ID)) }} regions={regions} />
      {user && <FavSync server={favIds} />}
      <ViewTransition>{children}</ViewTransition>
      <CompareBar />
      <footer className="ft"><div className="wrap">
        <div className="ft-top">
          <div className="ft-brand">
            <Link href="/" className="logo" aria-label={s.siteName}><Logo name={s.siteName} size={36} /></Link>
            {s.footerTagline && <p>{s.footerTagline}</p>}
            {(s.contactEmail || s.contactPhone) && <p className="ft-contacts">{s.contactPhone && <a href={`tel:${String(s.contactPhone).replace(/[^\d+]/g, "")}`}>{s.contactPhone}</a>}{s.contactEmail && <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>}</p>}
            {socials.length > 0 && <span className="socials">{socials.map(([k, t, ic]) => <a key={k} href={s[k]} target="_blank" rel="noopener" aria-label={t} title={t}>{ic}</a>)}</span>}
            <Link className="btn ft-add" href="/razmestit">Добавить объявление</Link>
          </div>
          {popular.length > 0 && <nav className="ft-col" aria-label="Популярные курорты"><b>Курорты</b><ul>{popular.map(r => <li key={r.slug}><Link href={`/kurort/${r.slug}`}>{r.name}</Link></li>)}</ul></nav>}
          <nav className="ft-col" aria-label="Гостям"><b>Гостям</b><ul>
            <li><Link href="/search">Поиск жилья</Link></li>
            <li><Link href="/articles">Полезные статьи</Link></li>
            <li><Link href="/favorites">Избранное</Link></li>
            <li><Link href="/my">Мои поездки</Link></li>
            {guestPages.map(p => <li key={p.slug}><Link href={`/p/${p.slug}`}>{p.title}</Link></li>)}
          </ul></nav>
          <nav className="ft-col" aria-label="Хозяевам"><b>Хозяевам</b><ul>
            <li><Link href="/razmestit">Разместить объявление</Link></li>
            <li><Link href="/cabinet">Личный кабинет</Link></li>
            {ownerPages.map(p => <li key={p.slug}><Link href={`/p/${p.slug}`}>{p.title}</Link></li>)}
          </ul></nav>
        </div>
        <div className="ft-b">
          <span>© {new Date().getFullYear()} «{s.siteName}». {s.footerText || "Жильё у Чёрного и Азовского моря без посредников."}</span>
          {docPages.length > 0 && <span className="ft-docs">{docPages.map(p => <Link key={p.slug} href={`/p/${p.slug}`}>{p.title}</Link>)}</span>}
        </div>
      </div></footer>
      {s.metrikaId && <Script id="ym" strategy="afterInteractive">{`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${Number(s.metrikaId)},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}</Script>}
    </>
  );
}
