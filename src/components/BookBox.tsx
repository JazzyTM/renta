"use client";
import { useActionState, useState } from "react";
import { DateRange, Guests } from "./DateRange";
import { createBooking, revealPhone, toggleFavorite } from "@/app/(site)/obj/[number]/actions";
import { quote, type ListingPricing } from "@/lib/pricing";

const rub = (n: number) => Math.round(n).toLocaleString("ru-RU") + " ₽";
const pl = (n: number, f: string[]) => { const a = n % 10, b = n % 100; return f[a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 1 : 2]; };

type Props = { listingId: string; pricing: ListingPricing; maxGuests: number; init: { ci?: string; co?: string }; fav: boolean; user: { name: string; email: string } | null; allowRequests: boolean; cancelDays: number };

export function BookBox({ listingId, pricing, maxGuests, init, fav: fav0, user, allowRequests, cancelDays }: Props) {
  const [ci, setCi] = useState(init.ci ?? ""), [co, setCo] = useState(init.co ?? "");
  const [adults, setAdults] = useState(2), [children, setChildren] = useState(0);
  const [phone, setPhone] = useState<null | { phone: string; name: string; whatsapp: boolean; telegram: string | null }>(null);
  const [phoneErr, setPhoneErr] = useState("");
  const [form, setForm] = useState(false);
  const [fav, setFav] = useState(fav0);
  const [state, action, pending] = useActionState(createBooking, null as null | { error?: string });
  const q = ci && co ? quote(pricing, new Date(ci + "T00:00:00Z"), new Date(co + "T00:00:00Z"), adults + children) : null;
  const over = adults + children > maxGuests;

  return (
    <aside className="book">
      <div className="row between"><span><b style={{ fontSize: 22 }}>от {rub(pricing.priceFrom)}</b> <span className="muted">/ ночь</span></span>
        <button className="chip" onClick={async () => { const r = await toggleFavorite(listingId); if ("login" in r) location.href = "/login"; else setFav(!!r.fav); }}>{fav ? "В избранном" : "В избранное"}</button></div>
      <DateRange ci={ci} co={co} onChange={(a, b) => { setCi(a); setCo(b); }} alignRight />
      <Guests adults={adults} children={children} onChange={(a, c) => { setAdults(a); setChildren(c); }} />
      {over && <div className="notice bad">Здесь можно разместить не больше {maxGuests} гостей.</div>}
      {q && !over && <div className="lines num">
        {q.groups.map(g => <div className="l" key={g.price}><span>{g.n} {pl(g.n, ["ночь", "ночи", "ночей"])} × {rub(g.price)}</span><span>{rub(g.n * g.price)}</span></div>)}
        {q.extra > 0 && <div className="l"><span>Доп. гости: {q.extraGuests} × {rub(pricing.extraGuestPrice)} × {q.n}</span><span>{rub(q.extra)}</span></div>}
        <div className="l total"><span>Примерно за поездку</span><span>{rub(q.total)}</span></div>
        {q.prepay > 0 && <div className="l small muted"><span>Предоплата после подтверждения</span><span>{rub(q.prepay)}</span></div>}
        <div className="small muted">Бесплатная отмена за {cancelDays} дн. до заезда</div>
      </div>}
      {phone ? <div className="phone"><b className="num">{phone.phone}</b><span className="small muted">{phone.name}{phone.whatsapp ? " · WhatsApp" : ""}{phone.telegram ? ` · Telegram ${phone.telegram}` : ""}</span><span className="small muted">Скажите, что нашли объявление у нас</span></div>
        : <button className="btn wide" onClick={async () => { const r = await revealPhone(listingId); if ("error" in r) setPhoneErr(r.error!); else setPhone(r as any); }}>Показать телефон</button>}
      {phoneErr && <div className="err">{phoneErr}</div>}
      {allowRequests && (!form ? <button className="btn ghost wide" disabled={over} onClick={() => setForm(true)}>Уточнить даты заявкой</button> :
        <form action={action} className="stack">
          <input type="hidden" name="listingId" value={listingId} /><input type="hidden" name="ci" value={ci} /><input type="hidden" name="co" value={co} />
          <input type="hidden" name="adults" value={adults} /><input type="hidden" name="children" value={children} />
          <div className="field"><label htmlFor="b-name">Имя</label><input className="input" id="b-name" name="name" defaultValue={user?.name} required /></div>
          <div className="field"><label htmlFor="b-email">Почта</label><input className="input" id="b-email" name="email" type="email" defaultValue={user?.email} required /></div>
          <div className="field"><label htmlFor="b-phone">Телефон, если удобно</label><input className="input" id="b-phone" name="phone" inputMode="tel" /></div>
          <div className="field"><label htmlFor="b-comment">Сообщение хозяину</label><textarea className="input" id="b-comment" name="comment" placeholder="Например: приедем поздно вечером" /></div>
          {state?.error && <div className="err">{state.error}</div>}
          <button className="btn wide" disabled={pending || !ci || !co}>{!ci || !co ? "Выберите даты" : pending ? "Отправляем…" : "Отправить заявку"}</button>
          <p className="small muted">Ответ хозяина придёт на почту.</p>
        </form>)}
    </aside>
  );
}
