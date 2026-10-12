import Link from "next/link";
import { ViewTransition } from "react";
import Script from "next/script";
import { getUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { FavSync } from "@/components/Fav";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [s, user] = await Promise.all([getSettings(), getUser()]);
  if (s.maintenance && !isStaff(user?.role))
    return <main className="wrap" style={{ paddingBlock: 80, textAlign: "center" }}><h1 className="h1">{s.siteName}</h1><p className="muted" style={{ marginTop: 12 }}>{s.maintenanceText}</p></main>;
  const favIds = user ? (await db.favorite.findMany({ where: { userId: user.id }, select: { listingId: true } })).map(f => f.listingId) : null;
  const pages = await db.page.findMany({ where: { isPublished: true, showInFooter: true }, select: { slug: true, title: true } });
  return (
    <>
      <Header user={user ? { name: user.name, email: user.email, staff: isStaff(user.role) } : null} siteName={s.siteName} social={{ vk: !!(s.vkEnabled && (s.vkClientId || process.env.VK_CLIENT_ID)), ya: !!(s.yandexEnabled && (s.yandexClientId || process.env.YANDEX_CLIENT_ID)) }} />
      {user && <FavSync server={favIds} />}
      <ViewTransition>{children}</ViewTransition>
      <footer className="foot"><div className="wrap">
        <span>© {new Date().getFullYear()} {s.siteName}{s.contactEmail ? ` · ${s.contactEmail}` : ""}{s.contactPhone ? ` · ${s.contactPhone}` : ""}</span>
        <span className="row">{pages.map(p => <Link key={p.slug} href={`/p/${p.slug}`}>{p.title}</Link>)}<Link href="/articles">Статьи</Link></span>
        {s.footerText && <span style={{ flexBasis: "100%" }}>{s.footerText}</span>}
      </div></footer>
      {s.metrikaId && <Script id="ym" strategy="afterInteractive">{`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${Number(s.metrikaId)},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}</Script>}
    </>
  );
}
