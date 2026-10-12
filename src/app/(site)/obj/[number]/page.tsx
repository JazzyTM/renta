import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { LISTING_TYPES, BEACH_TYPES, PREPAY } from "@/lib/labels";
import { walkMinutes, fmtDate } from "@/lib/format";
import { BookBox } from "@/components/BookBox";
import { ComplaintForm } from "@/components/ComplaintForm";

type P = { params: Promise<{ number: string }>; searchParams: Promise<Record<string, string>> };

async function load(number: string) {
  const n = Number(number);
  if (!Number.isInteger(n)) return null;
  return db.listing.findUnique({ where: { number: n }, include: {
    photos: { orderBy: { sort: "asc" } }, resort: { include: { region: true } }, prices: true, rooms: true,
    amenities: { include: { amenity: true } }, reviews: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 20 },
  }});
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = await load((await params).number);
  if (!l) return {};
  return { title: l.seoTitle || `${l.title}, ${l.resort.name}`, description: l.seoDescription || l.description.slice(0, 160), openGraph: { images: l.photos[0]?.url ? [l.photos[0].url] : [] } };
}

export default async function ListingPage({ params, searchParams }: P) {
  const [l, user, s, sp] = await Promise.all([load((await params).number), getUser(), getSettings(), searchParams]);
  if (!l) notFound();
  const visible = l.status === "PUBLISHED" && (s.postModeration || l.moderation === "APPROVED");
  if (!visible && !(user && (user.id === l.ownerId || isStaff(user.role)))) notFound();
  await db.listing.update({ where: { id: l.id }, data: { views: { increment: 1 } } });
  const d = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  await db.listingStatDaily.upsert({ where: { listingId_date: { listingId: l.id, date: d } }, create: { listingId: l.id, date: d, views: 1 }, update: { views: { increment: 1 } } });
  const fav = user ? !!(await db.favorite.findUnique({ where: { userId_listingId: { userId: user.id, listingId: l.id } } })) : false;
  const groups = new Map<string, string[]>();
  for (const a of l.amenities) { const g = a.amenity.group; if (!groups.has(g)) groups.set(g, []); groups.get(g)!.push(a.amenity.name); }
  const jsonLd = { "@context": "https://schema.org", "@type": "LodgingBusiness", name: l.title, address: l.address, image: l.photos.map(p => p.url),
    ...(l.ratingCount ? { aggregateRating: { "@type": "AggregateRating", ratingValue: l.ratingAvg, reviewCount: l.ratingCount } } : {}) };

  return (
    <main className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="small muted" style={{ paddingBlock: 14 }}><Link href="/">Главная</Link> / <Link href={`/kurort/${l.resort.slug}`}>{l.resort.name}</Link></nav>
      {!visible && <div className="notice" style={{ marginBottom: 12 }}>Объявление не видно в поиске: {l.status === "PUBLISHED" ? "ждёт проверки" : "не опубликовано"}.</div>}
      <div className="stack" style={{ marginBottom: 16 }}>
        <div className="row small"><span className="muted">{LISTING_TYPES[l.type]} · {l.resort.name}, {l.resort.region.name}</span>{l.verified && <span className="tag ok">Хозяин проверен</span>}</div>
        <h1 className="h1">{l.title}</h1>
        {l.ratingCount > 0 && <span className="rating"><b>{l.ratingAvg.toFixed(1)}</b> {l.ratingCount} отзывов</span>}
      </div>
      {l.photos.length > 0 && <div className="gallery" style={{ ["--n" as any]: l.photos.length }}>{l.photos.slice(0, 5).map(p => <img key={p.id} src={p.url} alt={p.caption ?? ""} />)}</div>}
      <div className="detail">
        <div className="dmain">
          <div className="facts">
            {l.seaDistance != null && <div className="fact"><b className="num">{l.seaDistance} м</b><span>до моря, {walkMinutes(l.seaDistance)} мин пешком</span></div>}
            {l.beachType && <div className="fact"><b>{BEACH_TYPES[l.beachType]}</b><span>пляж</span></div>}
            <div className="fact"><b className="num">до {l.maxGuests}</b><span>гостей</span></div>
            <div className="fact"><b className="num">{l.minNights}+</b><span>ночей минимум</span></div>
          </div>
          <section><h2 className="h2" style={{ marginBottom: 10 }}>О жилье</h2><p style={{ whiteSpace: "pre-wrap", maxWidth: "70ch" }}>{l.description}</p>
            {l.address && <p className="muted" style={{ marginTop: 10 }}>{l.address}{l.lat && l.lng ? <> · <a href={`https://yandex.ru/maps/?pt=${l.lng},${l.lat}&z=16`} target="_blank" rel="noopener">На карте</a></> : null}</p>}</section>
          {l.rooms.length > 0 && <section><h2 className="h2" style={{ marginBottom: 10 }}>Номера</h2><div className="tablewrap"><table className="t"><thead><tr><th>Номер</th><th>Гостей</th><th>Цена за ночь</th></tr></thead><tbody>
            {l.rooms.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.guests}</td><td className="num">{r.price ? r.price.toLocaleString("ru-RU") + " ₽" : "—"}</td></tr>)}</tbody></table></div></section>}
          {groups.size > 0 && <section><h2 className="h2" style={{ marginBottom: 10 }}>Удобства и услуги</h2>
            <div className="amenGroups">{[...groups].map(([g, list]) => <div key={g}><h3>{g}</h3><ul>{list.map(n => <li key={n}>{n}</li>)}</ul></div>)}</div></section>}
          <section><h2 className="h2" style={{ marginBottom: 10 }}>Цены по месяцам</h2><div className="row">
            {l.prices.sort((a, b) => a.month - b.month).map(p => <span key={p.month} className="chip num">{["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"][p.month - 1]}: {p.price.toLocaleString("ru-RU")} ₽</span>)}</div></section>
          <section><h2 className="h2" style={{ marginBottom: 10 }}>Правила</h2><div className="rules">
            <div className="r"><span>Заезд и выезд</span><span>после {l.checkInTime}, до {l.checkOutTime}</span></div>
            <div className="r"><span>Предоплата</span><span>{l.prepayType === "PERCENT" ? `${l.prepayPercent}%` : PREPAY[l.prepayType]}</span></div>
            <div className="r"><span>Бесплатная отмена</span><span>за {l.cancelDays} дн. до заезда</span></div>
            <div className="r"><span>Дети</span><span>{l.childrenAllowed ? "можно" : "нельзя"}</span></div>
            <div className="r"><span>Животные</span><span>{l.petsAllowed ? "можно" : "нельзя"}</span></div>
            <div className="r"><span>Курение</span><span>{l.smokingAllowed ? "можно" : "нельзя"}</span></div></div></section>
          <section><h2 className="h2" style={{ marginBottom: 10 }}>Отзывы</h2>
            {l.reviews.length ? <div className="stack">{l.reviews.map(r => <div key={r.id} className="card-box stack" style={{ gap: 6 }}>
              <div className="row between"><b>{r.authorName} <span className="small muted">{fmtDate(r.createdAt)}</span></b><span className="rating"><b>{r.rating}</b></span></div>
              <p>{r.text}</p>{r.ownerReply && <p className="small muted">Ответ хозяина: {r.ownerReply}</p>}</div>)}</div> : <p className="muted">Отзывов пока нет.</p>}
          </section>
          <ComplaintForm listingId={l.id} />
        </div>
        <BookBox listingId={l.id} pricing={{ prices: l.prices, priceFrom: l.priceFrom, baseGuests: l.baseGuests, extraGuestPrice: l.extraGuestPrice, prepayType: l.prepayType, prepayPercent: l.prepayPercent }}
          maxGuests={l.maxGuests} init={{ ci: sp.ci, co: sp.co }} fav={fav} user={user ? { name: user.name, email: user.email ?? "" } : null} allowRequests={!!s.bookingRequests} cancelDays={l.cancelDays} />
      </div>
    </main>
  );
}
