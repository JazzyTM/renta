import Link from "next/link";
import { LISTING_TYPES } from "@/lib/labels";
import { rub, plural, parseDate } from "@/lib/format";
import { quote } from "@/lib/pricing";
import type { CardListing } from "@/lib/queries";

export function ListingCard({ l, ci, co, guests = 2 }: { l: CardListing; ci?: string; co?: string; guests?: number }) {
  const q = ci && co ? quote(l, parseDate(ci), parseDate(co), guests) : null;
  const hl = l.highlightedUntil && l.highlightedUntil > new Date();
  const qs = ci && co ? `?ci=${ci}&co=${co}` : "";
  return (
    <Link href={`/obj/${l.number}${qs}`} className={`lcard ${hl ? "hl" : ""}`}>
      <div className="ph">
        {l.photos[0] ? <img src={l.photos[0].url} alt="" loading="lazy" /> : <span className="noimg">Нет фото</span>}
        {l.verified && <span className="badge tag ok">Проверен</span>}
      </div>
      <div className="t">
        <span className="small muted">{LISTING_TYPES[l.type]} · {l.resort.name}</span>
        <b>{l.title}</b>
        {l.seaDistance != null && <span className="seaLine small">{l.seaDistance} м до моря</span>}
        <span className="row between" style={{ marginTop: 4 }}>
          <span className="num">{q ? <><b>{rub(q.total)}</b> <span className="muted small">за {q.n} {plural(q.n, ["ночь", "ночи", "ночей"])}</span></> : <><b>от {rub(l.priceFrom)}</b> <span className="muted small">/ ночь</span></>}</span>
          {l.ratingCount > 0 && <span className="rating"><b className="num">{l.ratingAvg.toFixed(1)}</b></span>}
        </span>
      </div>
    </Link>
  );
}
