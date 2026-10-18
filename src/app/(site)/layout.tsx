import Link from "next/link";
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
  const socials = [["socialVk", "ВКонтакте", "VK"], ["socialTelegram", "Telegram", "TG"], ["socialYoutube", "YouTube", "▶"]].filter(([k]) => s[k]);
  return (
    <>
      <Header user={user ? { name: user.name, email: user.email, staff: isStaff(user.role) } : null} siteName={s.siteName} social={{ vk: !!(s.vkEnabled && (s.vkClientId || process.env.VK_CLIENT_ID)), ya: !!(s.yandexEnabled && (s.yandexClientId || process.env.YANDEX_CLIENT_ID)) }} regions={regions} />
      {user && <FavSync server={favIds} />}
      <ViewTransition>{children}</ViewTransition>
      <CompareBar />
      <footer className="foot"><div className="wrap">
        <div className="foot-l">
          <Link href="/" className="logo">{s.siteName}</Link>
          {s.footerTagline && <span className="small">{s.footerTagline}</span>}
          {socials.length > 0 && <span className="socials">{socials.map(([k, t, ic]) => <a key={k} href={s[k]} target="_blank" rel="noopener" aria-label={t} title={t}>{ic}</a>)}</span>}
          {(s.contactEmail || s.contactPhone) && <span className="small muted">{[s.contactPhone, s.contactEmail].filter(Boolean).join(" · ")}</span>}
        </div>
        <div className="foot-c"><b>Гостям</b><ul>
          <li><Link href="/favorites">Избранное</Link></li><li><Link href="/compare">Сравнение</Link></li>
          <li><Link href="/my">Мои поездки</Link></li><li><Link href="/articles">Статьи</Link></li>
        </ul></div>
        {pages.length > 0 && <div className="foot-c"><b>Информация</b><ul>{pages.map(p => <li key={p.slug}><Link href={`/p/${p.slug}`}>{p.title}</Link></li>)}</ul></div>}
        <div className="foot-c foot-r"><b>Хозяевам</b>
          <Link className="btn wide" href="/cabinet/new">Добавить объявление</Link>
          <Link className="btn ghost wide" href="/cabinet">Личный кабинет</Link>
        </div>
        <div className="foot-b small muted">© {new Date().getFullYear()} {s.siteName}{s.footerText ? `. ${s.footerText}` : ""}</div>
      </div></footer>
      {s.metrikaId && <Script id="ym" strategy="afterInteractive">{`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${Number(s.metrikaId)},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}</Script>}
    </>
  );
}
