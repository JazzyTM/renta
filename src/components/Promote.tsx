import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ownerPlan } from "@/lib/plan";
import { promoPrice, PROMO_DAYS } from "@/lib/payments";
import { rub, fmtDate } from "@/lib/format";
import { ActionForm } from "./Forms";
import { buyPromotion } from "@/app/(site)/cabinet/actions";

const INFO: Record<string, [string, string]> = {
  BOOST: ["Поднять в поиске", "Объявление встанет выше остальных в выдаче курорта. Действует, пока другие не поднимутся."],
  HIGHLIGHT: ["Выделить цветом", "Карточка заметнее в списке. 7 дней."],
  FEATURED: ["На главной курорта", "Блок «Рекомендуем» на странице курорта. 7 дней."],
  TOP: ["Закрепить вверху", "Первые места в выдаче курорта. 7 дней."],
};

export async function Promote({ listingId }: { listingId: string }) {
  const [l, s] = await Promise.all([db.listing.findUniqueOrThrow({ where: { id: listingId } }), getSettings()]);
  const plan = await ownerPlan(l.ownerId);
  const free = plan.free && s.freePromotions;
  const now = new Date();
  const active: Record<string, string | null> = {
    BOOST: l.boostedAt ? `поднято ${fmtDate(l.boostedAt)}` : null,
    HIGHLIGHT: l.highlightedUntil && l.highlightedUntil > now ? `до ${fmtDate(l.highlightedUntil)}` : null,
    FEATURED: l.isFeatured && l.promotedUntil && l.promotedUntil > now ? `до ${fmtDate(l.promotedUntil)}` : null,
    TOP: !l.isFeatured && l.promotedUntil && l.promotedUntil > now ? `до ${fmtDate(l.promotedUntil)}` : null,
  };
  return (
    <section className="card-box stack"><h2 className="h2">Продвижение</h2>
      <div className="grid2">
        {await Promise.all(Object.keys(INFO).map(async type => {
          const price = free ? 0 : await promoPrice(type);
          return (
            <div key={type} className="card-box stack" style={{ padding: 14 }}>
              <div className="row between"><b>{INFO[type][0]}</b><span className="num">{price ? rub(price) : "бесплатно"}</span></div>
              <p className="small muted">{INFO[type][1]}</p>
              {active[type] && <span className="tag ok">Включено, {active[type]}</span>}
              <ActionForm action={buyPromotion.bind(null, listingId, type)} submit={price ? "Купить" : "Включить"} className="row">
                {price > 0 && <input className="input" name="code" placeholder="Промокод" style={{ width: 130 }} />}
              </ActionForm>
            </div>
          );
        }))}
      </div>
      <p className="small muted">Срок услуг: {Object.entries(PROMO_DAYS).filter(([, d]) => d).map(([k, d]) => `${INFO[k][0].toLowerCase()} ${d} дн.`).join(", ")}.</p>
    </section>
  );
}
