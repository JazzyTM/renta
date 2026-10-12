import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { LISTING_TYPES, BEACH_TYPES, PREPAY } from "@/lib/labels";
import { walkMinutes, fmtDate, rub, plural } from "@/lib/format";
import { prepOf } from "@/lib/collections";
import { BookingProvider, DatesPanel, OwnerCard, RequestButton } from "@/components/Booking";
import { FavButton } from "@/components/Fav";
import { ComplaintForm } from "@/components/ComplaintForm";
import { Gallery } from "@/components/Gallery";
import { MobileBar } from "@/components/MobileBar";
import { Recent } from "@/components/Recent";
import { ListingCard } from "@/components/ListingCard";
import { cardInclude, visibleWhere } from "@/lib/queries";
import { toCard } from "@/lib/card";

// Похожие: тот же курорт, затем регион; ближе по цене выше
async function similar(l: { id: string; resortId: string; priceFrom: number; resort: { regionId: string } }) {
  const where = await visibleWhere();
  const near = (a: { priceFrom: number }, b: { priceFrom: number }) => Math.abs(a.priceFrom - l.priceFrom) - Math.abs(b.priceFrom - l.priceFrom);
  const same = await db.listing.findMany({ where: { AND: [where, { resortId: l.resortId, id: { not: l.id } }] }, include: cardInclude, take: 24 });
  let out = same.sort(near).slice(0, 4);
  if (out.length < 4) {
    const more = await db.listing.findMany({ where: { AND: [where, { resort: { regionId: l.resort.regionId }, resortId: { not: l.resortId }, id: { not: l.id } }] }, include: cardInclude, take: 24 });
    out = [...out, ...more.sort(near).slice(0, 4 - out.length)];
  }
  return out.map(toCard);
}

type P = { params: Promise<{ number: string }>; searchParams: Promise<Record<string, string>> };

async function load(number: string) {
  const n = Number(number);
  if (!Number.isInteger(n)) return null;
  return db.listing.findUnique({ where: { number: n }, include: {
    photos: { orderBy: { sort: "asc" } }, resort: { include: { region: true } }, prices: true, rooms: true, owner: { select: { name: true, createdAt: true } },
    amenities: { include: { amenity: true } }, reviews: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 20 },
  }});
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = await load((await params).number);
  if (!l) return {};
  return { title: l.seoTitle || `${l.title}, ${l.resort.name}`, description: l.seoDescription || l.description.slice(0, 160), openGraph: { images: l.photos[0]?.url ? [l.photos[0].url] : [] } };
}

const MON = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const I = {
  check: "M5 12.5l4.5 4.5L19 7",
  in: "M10 17l5-5-5-5M15 12H3M14 3h4a3 3 0 013 3v12a3 3 0 01-3 3h-4",
  out: "M14 17l5-5-5-5M19 12H7M10 21H6a3 3 0 01-3-3V6a3 3 0 013-3h4",
  kid: "M12 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM8 22v-7l-2-3 3-4h6l3 4-2 3v7",
  pet: "M5 10a2 2 0 100-4 2 2 0 000 4zM19 10a2 2 0 100-4 2 2 0 000 4zM9 6a2 2 0 100-4 2 2 0 000 4zM15 6a2 2 0 100-4 2 2 0 000 4zM12 12c-3 0-6 4-6 7 0 2 2 3 6 3s6-1 6-3c0-3-3-7-6-7z",
  smoke: "M3 15h14v4H3zM20 15v4M17 4c0 2 2 2 2 4s-2 2-2 4",
  pay: "M3 6h18v12H3zM3 10h18M7 15h3",
  cancel: "M12 3a9 9 0 100 18 9 9 0 000-18zM9 9l6 6M15 9l-6 6",
  guests: "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 100-5M21 20c0-2.8-1.8-5-4-5.6",
};
const Ic = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default async function ListingPage({ params, searchParams }: P) {
  const [l, user, s, sp] = await Promise.all([load((await params).number), getUser(), getSettings(), searchParams]);
  if (!l) notFound();
  const visible = l.status === "PUBLISHED" && (s.postModeration || l.moderation === "APPROVED");
  if (!visible && !(user && (user.id === l.ownerId || isStaff(user.role)))) notFound();
  await db.listing.update({ where: { id: l.id }, data: { views: { increment: 1 } } });
  const d = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  await db.listingStatDaily.upsert({ where: { listingId_date: { listingId: l.id, date: d } }, create: { listingId: l.id, date: d, views: 1 }, update: { views: { increment: 1 } } });
  const [like, nearby] = await Promise.all([
    similar(l),
    db.resort.findMany({ where: { regionId: l.resort.regionId, isActive: true, id: { not: l.resortId } }, orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ]);
  const groups = new Map<string, string[]>();
  for (const a of l.amenities) { const g = a.amenity.group; if (!groups.has(g)) groups.set(g, []); groups.get(g)!.push(a.amenity.name); }
  const jsonLd = { "@context": "https://schema.org", "@type": "LodgingBusiness", name: l.title, address: l.address, image: l.photos.map(p => p.url),
    ...(l.ratingCount ? { aggregateRating: { "@type": "AggregateRating", ratingValue: l.ratingAvg, reviewCount: l.ratingCount } } : {}) };
  const prices = [...l.prices].filter(p => p.price > 0).sort((a, b) => a.month - b.month);
  const curMonth = new Date().getUTCMonth() + 1;
  const where = l.address ? (l.address.toLowerCase().includes(l.resort.name.toLowerCase()) ? l.address : `${l.resort.name}, ${l.address}`) : l.resort.name;
  const rules: [string, string, string][] = [
    [I.in, "Заезд", `после ${l.checkInTime}`], [I.out, "Выезд", `до ${l.checkOutTime}`],
    [I.kid, "Дети", l.childrenAllowed ? "можно" : "нельзя"], [I.pet, "Животные", l.petsAllowed ? "можно" : "нельзя"],
    [I.smoke, "Курение", l.smokingAllowed ? "можно" : "нельзя"], [I.pay, "Предоплата", l.prepayType === "PERCENT" ? `${l.prepayPercent}%` : PREPAY[l.prepayType]],
    [I.cancel, "Бесплатная отмена", `за ${l.cancelDays} дн. до заезда`], [I.guests, "Гостей", `до ${l.maxGuests}, минимум ${l.minNights} ${plural(l.minNights, ["ночь", "ночи", "ночей"])}`],
  ];

  return (
    <main className="gray obj">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="wrap">
        <nav className="crumbs" aria-label="Навигация"><Link href="/">Главная</Link><span>/</span><span>{l.resort.region.name}</span><span>/</span><Link href={`/kurort/${l.resort.slug}`}>{l.resort.name}</Link><span>/</span><span>{LISTING_TYPES[l.type]}</span></nav>
        {!visible && <div className="notice" style={{ marginBottom: 12 }}>Объявление не видно в поиске: {l.status === "PUBLISHED" ? "ждёт проверки" : "не опубликовано"}.</div>}
        <span className="oid">ID {l.number}</span>
        <div className="ohead">
          <div><h1 className="h1">{l.title}</h1>
            <div className="osub">{l.lat && l.lng ? <a href="#map">{where}</a> : <span>{where}</span>}
              {l.ratingCount > 0 && <span className="meta"><span className="score num">{l.ratingAvg.toFixed(1)}</span><a href="#reviews">{l.ratingCount} {plural(l.ratingCount, ["отзыв", "отзыва", "отзывов"])}</a></span>}
              {l.verified && <span className="vtag">Хозяин проверен</span>}</div></div>
          <FavButton id={l.id} big />
        </div>
        <Gallery photos={l.photos.map(p => ({ url: p.url, caption: p.caption }))} title={l.title} />
        <BookingProvider listingId={l.id} pricing={{ prices: l.prices, priceFrom: l.priceFrom, baseGuests: l.baseGuests, extraGuestPrice: l.extraGuestPrice, prepayType: l.prepayType, prepayPercent: l.prepayPercent }}
          maxGuests={l.maxGuests} cancelDays={l.cancelDays} allowRequests={!!s.bookingRequests} init={{ ci: sp.ci, co: sp.co }} user={user ? { name: user.name, email: user.email ?? "" } : null}>
          <div className="ogrid">
            <div className="ocol">
              <DatesPanel />
              {l.rooms.length > 0 && <section className="panel"><h2 className="ph2">Доступные варианты</h2><p className="small muted">{l.rooms.length} {plural(l.rooms.length, ["вариант", "варианта", "вариантов"])} размещения</p>
                <div className="rooms">{l.rooms.map(r => <div key={r.id} className="room">
                  <div><b>{r.name}</b><span className="ri"><Ic d={I.guests} />{r.guests} {plural(r.guests, ["место", "места", "мест"])}{r.count > 1 ? ` · таких ${r.count}` : ""}</span></div>
                  <div className="rp">{r.price ? <><b className="num">{rub(r.price)}</b><span>за сутки</span></> : <span className="muted">цена по запросу</span>}<RequestButton room={r.name} /></div>
                </div>)}</div></section>}
              {prices.length > 0 && <details className="panel fold" open={l.rooms.length === 0}>
                <summary><h2 className="ph2">Цены на {new Date().getUTCFullYear()} год</h2><span className="fold-l">Показать</span></summary>
                <div className="ptable">{prices.map(p => <div key={p.month} className={p.month === curMonth ? "cur" : ""}><span>{MON[p.month - 1]}</span><b className="num">{rub(p.price)}</b></div>)}</div>
                <p className="small muted" style={{ marginTop: 10 }}>Цена за сутки за всё жильё до {l.baseGuests} гостей{l.extraGuestPrice ? `, каждый следующий гость +${rub(l.extraGuestPrice)}` : ""}.</p>
              </details>}
              <section className="panel"><h2 className="ph2">Описание</h2>
                <div className="facts2">
                  {l.seaDistance != null && <span><b className="num">{l.seaDistance} м</b> до моря, {walkMinutes(l.seaDistance)} мин пешком</span>}
                  {l.beachType && <span>Пляж: <b>{BEACH_TYPES[l.beachType].toLowerCase()}</b></span>}
                </div>
                <p className="desc">{l.description}</p></section>
              {groups.size > 0 && <section className="panel"><h2 className="ph2">Что у нас есть</h2>
                <div className="amen2">{[...groups].map(([g, list]) => <div key={g}><h3>{g}</h3><ul>{list.map(n => <li key={n}><Ic d={I.check} />{n}</li>)}</ul></div>)}</div></section>}
              <section className="panel"><h2 className="ph2">Правила проживания</h2>
                <div className="rules2">{rules.map(([ic, t, v]) => <div key={t}><Ic d={ic} /><div><b>{t}</b><span>{v}</span></div></div>)}</div></section>
              {l.lat && l.lng && <section className="panel" id="map"><h2 className="ph2">На карте</h2><p className="small muted">{where}</p>
                <a className="mapbox" href={`https://yandex.ru/maps/?pt=${l.lng},${l.lat}&z=16&l=map`} target="_blank" rel="noopener"><span className="btn ghost sm">Показать на карте</span></a></section>}
              <section className="panel" id="reviews"><h2 className="ph2">Отзывы гостей</h2>
                {l.ratingCount > 0 && <p className="meta" style={{ marginBottom: 12 }}><span className="score num">{l.ratingAvg.toFixed(1)}</span> {l.ratingCount} {plural(l.ratingCount, ["отзыв", "отзыва", "отзывов"])}</p>}
                {l.reviews.length ? <div className="revs">{l.reviews.map(r => <div key={r.id} className="rev">
                  <div className="rv-h"><span className="ow-av sm">{r.authorName.trim()[0]?.toUpperCase()}</span><div><b>{r.authorName}</b><span className="small muted">{fmtDate(r.createdAt)}</span></div><span className="score num">{r.rating}</span></div>
                  <p>{r.text}</p>{r.ownerReply && <div className="reply"><b className="small">Ответ хозяина</b><p>{r.ownerReply}</p></div>}</div>)}</div>
                  : <p className="muted">Отзывов пока нет. Оставить отзыв можно после поездки по ссылке из письма.</p>}
              </section>
              <ComplaintForm listingId={l.id} />
            </div>
            <aside className="oside"><OwnerCard name={l.contactName || l.owner.name} since={l.owner.createdAt.getUTCFullYear()} siteName={s.siteName} showPhone={!!s.showPhone} /></aside>
          </div>
        </BookingProvider>
        {like.length > 0 && <section className="hsec"><h2 className="h2" style={{ marginBottom: 16 }}>Другие объекты {prepOf(l.resort)} и рядом</h2><div className="cards">{like.map(c => <ListingCard key={c.id} l={c} />)}</div></section>}
        <Recent id={l.id} />
        {nearby.length > 0 && <section className="hsec"><h2 className="h2" style={{ marginBottom: 12 }}>Курорты рядом</h2><div className="qchips wrapchips">{nearby.map(r => <Link key={r.slug} className="chip" href={`/kurort/${r.slug}`}>{r.name}</Link>)}</div></section>}
      </div>
      {visible && <MobileBar price={l.priceFrom} requests={!!s.bookingRequests} />}
    </main>
  );
}
