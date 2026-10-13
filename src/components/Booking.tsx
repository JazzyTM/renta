"use client";
import { createContext, useActionState, useContext, useEffect, useRef, useState } from "react";
import { Honeypot } from "./Honeypot";
import { DateRange, Guests } from "./DateRange";
import { createBooking, revealPhone } from "@/app/(site)/obj/[number]/actions";
import { quote, type ListingPricing } from "@/lib/pricing";
import { rub, plural } from "@/lib/format";
import { toast } from "./Toaster";
import { useAB, abGoal } from "./AB";

type Phone = { phone: string; name: string; whatsapp: boolean; telegram: string | null };
type Ctx = {
  listingId: string; pricing: ListingPricing; maxGuests: number; cancelDays: number; allowRequests: boolean;
  ci: string; co: string; setDates: (a: string, b: string) => void; adults: number; children: number; setGuests: (a: number, c: number) => void;
  phone: Phone | null; showPhone: () => Promise<void>; openRequest: (room?: string) => void; busy: string[];
};
const C = createContext<Ctx | null>(null);
const use = () => useContext(C)!;

// Общее состояние страницы объявления: даты, гости, телефон, окно заявки
export function BookingProvider({ children, listingId, pricing, maxGuests, cancelDays, allowRequests, init, user, busy = [] }: {
  children: React.ReactNode; listingId: string; pricing: ListingPricing; maxGuests: number; cancelDays: number; allowRequests: boolean;
  init: { ci?: string; co?: string }; user: { name: string; email: string } | null; busy?: string[];
}) {
  const [ci, setCi] = useState(init.ci ?? ""), [co, setCo] = useState(init.co ?? "");
  const [adults, setAdults] = useState(2), [children_, setChildren] = useState(0);
  const [phone, setPhone] = useState<Phone | null>(null);
  const [req, setReq] = useState<null | { room?: string }>(null);

  async function showPhone() {
    if (phone) return;
    const r = await revealPhone(listingId);
    if ("error" in r) { toast(r.error!, "err"); return; }
    setPhone(r as Phone); abGoal("phone");
    window.dispatchEvent(new CustomEvent("phone", { detail: (r as Phone).phone }));
  }
  const openRequest = (room?: string) => setReq({ room });

  // Кнопки нижней панели на телефоне
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent).detail === "phone") { document.getElementById("owner")?.scrollIntoView({ behavior: "smooth", block: "center" }); showPhone(); }
      else openRequest();
    };
    window.addEventListener("book", on); return () => window.removeEventListener("book", on);
  });

  const v: Ctx = { listingId, pricing, maxGuests, cancelDays, allowRequests, ci, co, setDates: (a, b) => { setCi(a); setCo(b); },
    adults, children: children_, setGuests: (a, c) => { setAdults(a); setChildren(c); }, phone, showPhone, openRequest, busy };
  return <C.Provider value={v}>{children}{req && <RequestModal room={req.room} user={user} onClose={() => setReq(null)} />}</C.Provider>;
}

// «Даты и гости»: выбор дат и расчёт стоимости
export function DatesPanel() {
  const x = use();
  const [asked, setAsked] = useState(false);
  const q = x.ci && x.co ? quote(x.pricing, new Date(x.ci + "T00:00:00Z"), new Date(x.co + "T00:00:00Z"), x.adults + x.children) : null;
  const over = x.adults + x.children > x.maxGuests;
  const box = useRef<HTMLDivElement>(null);
  function check() {
    setAsked(true);
    if (!x.ci || !x.co) (box.current?.querySelector(".dbtn") as HTMLButtonElement | null)?.click();
  }
  return (
    <section className="panel" ref={box} id="dates">
      <h2 className="ph2">Даты и гости</h2>
      <div className="search dsearch">
        <DateRange single ci={x.ci} co={x.co} onChange={x.setDates} prices={x.pricing.prices} busy={x.busy} />
        <Guests bare adults={x.adults} children={x.children} onChange={x.setGuests} />
        <button type="button" className="btn" onClick={check}>Узнать цены</button>
      </div>
      {over && <div className="notice bad" style={{ marginTop: 12 }}>Здесь можно разместить не больше {x.maxGuests} гостей.</div>}
      {q && !over && (asked || x.ci) && <div className="quote num">
        {q.groups.map(g => <div className="l" key={g.price}><span>{g.n} {plural(g.n, ["ночь", "ночи", "ночей"])} × {rub(g.price)}</span><span>{rub(g.n * g.price)}</span></div>)}
        {q.extra > 0 && <div className="l"><span>Доп. гости: {q.extraGuests} × {rub(x.pricing.extraGuestPrice)} × {q.n}</span><span>{rub(q.extra)}</span></div>}
        <div className="l total"><span>Примерно за поездку</span><span>{rub(q.total)}</span></div>
        {q.prepay > 0 && <div className="l small muted"><span>Предоплата после подтверждения</span><span>{rub(q.prepay)}</span></div>}
        <div className="row between" style={{ marginTop: 6 }}><span className="small muted">Бесплатная отмена за {x.cancelDays} дн. до заезда</span>
          {x.allowRequests && <button type="button" className="btn sm" onClick={() => x.openRequest()}>Отправить заявку</button>}</div>
      </div>}
    </section>
  );
}

// Кнопка заявки у номера
export function RequestButton({ room }: { room?: string }) {
  const x = use();
  const label = useAB("request_button", "Отправить заявку");
  if (!x.allowRequests) return <button type="button" className="btn sm" onClick={() => { document.getElementById("owner")?.scrollIntoView({ behavior: "smooth", block: "center" }); x.showPhone(); }}>Позвонить</button>;
  return <button type="button" className="btn sm" onClick={() => x.openRequest(room)}>{label}</button>;
}

// Карточка хозяина справа
export function OwnerCard({ name, since, siteName, showPhone, reply, idOk }: { name: string; since: number; siteName: string; showPhone: boolean; reply?: string | null; idOk?: boolean }) {
  const x = use();
  const p = x.phone;
  const reqLabel = useAB("request_button", "Отправить заявку"), phoneLabel = useAB("phone_button", "Показать телефон");
  const tel = p ? p.phone.replace(/[^+\d]/g, "") : "";
  return (
    <div className="panel owner" id="owner">
      <div className="ow-h"><span className="ow-av">{(name || "Х").trim()[0].toUpperCase()}</span><div><b>{name || "Хозяин"}</b><span>На сайте с {since} года</span>{idOk && <span className="vtag">Личность подтверждена</span>}{reply && <span className="fast">{reply}</span>}</div></div>
      <p className="small">При звонке скажите, что нашли объявление на {siteName}</p>
      {p ? <div className="ow-ph">
        {p.name && p.name !== name && <span className="small muted">{p.name}</span>}
        <a className="num" href={`tel:${tel}`}>{p.phone}</a>
        <span className="ow-links small">
          {p.whatsapp && <a href={`https://wa.me/${tel.replace("+", "")}`} target="_blank" rel="noopener">WhatsApp</a>}
          {p.telegram && <a href={`https://t.me/${p.telegram.replace(/^@/, "")}`} target="_blank" rel="noopener">Telegram</a>}
        </span>
      </div> : showPhone && <button type="button" className="btn ghost wide" onClick={x.showPhone}>{phoneLabel}</button>}
      {x.allowRequests && <button type="button" className="btn wide" onClick={() => x.openRequest()}>{reqLabel}</button>}
    </div>
  );
}

function RequestModal({ room, user, onClose }: { room?: string; user: { name: string; email: string } | null; onClose: () => void }) {
  const x = use();
  const [state, action, pending] = useActionState(createBooking, null as null | { error?: string });
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  const ready = x.ci && x.co;
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label="Заявка хозяину" onClick={e => e.stopPropagation()}>
      <button className="x" aria-label="Закрыть" onClick={onClose}>×</button>
      <h2 className="h2">Заявка хозяину</h2>
      {room && <p className="small muted">{room}</p>}
      <form action={action} onSubmit={() => abGoal("request")} className="stack" style={{ marginTop: 14 }}><Honeypot />
        <input type="hidden" name="listingId" value={x.listingId} /><input type="hidden" name="ci" value={x.ci} /><input type="hidden" name="co" value={x.co} />
        <input type="hidden" name="adults" value={x.adults} /><input type="hidden" name="children" value={x.children} />
        <div className="search dsearch col">
          <DateRange single ci={x.ci} co={x.co} onChange={x.setDates} prices={x.pricing.prices} busy={x.busy} />
          <Guests bare adults={x.adults} children={x.children} onChange={x.setGuests} />
        </div>
        <div className="field"><label htmlFor="b-name">Имя</label><input className="input" id="b-name" name="name" defaultValue={user?.name} required /></div>
        <div className="field"><label htmlFor="b-email">Почта</label><input className="input" id="b-email" name="email" type="email" defaultValue={user?.email} required /></div>
        <div className="field"><label htmlFor="b-phone">Телефон, если удобно</label><input className="input" id="b-phone" name="phone" inputMode="tel" /></div>
        <div className="field"><label htmlFor="b-comment">Сообщение хозяину</label><textarea className="input" id="b-comment" name="comment" defaultValue={room ? `Интересует: ${room}. ` : ""} placeholder="Например: приедем поздно вечером" /></div>
        {state?.error && <div className="err">{state.error}</div>}
        <button className="btn wide" disabled={pending || !ready}>{!ready ? "Выберите даты" : pending ? "Отправляем…" : "Отправить заявку"}</button>
        <p className="small muted">Ответ хозяина придёт на почту.</p>
      </form>
    </div></div>
  );
}
