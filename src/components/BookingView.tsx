import { fmtRange, rub } from "@/lib/format";
import { BOOKING_STATUS } from "@/lib/labels";
import { postMessage } from "@/app/(site)/b/actions";

type B = Awaited<ReturnType<typeof import("@/lib/booking").bookingAccess>> extends infer T ? T extends { b: infer X } ? X : never : never;

export function BookingSummary({ b }: { b: B }) {
  const [st, tone] = BOOKING_STATUS[b.status];
  return (
    <div className="card-box stack">
      <div className="row between"><b>Заявка №{b.number}</b><span className={`tag ${tone}`}>{st}</span></div>
      <dl className="kv">
        <dt>Объект</dt><dd><a href={`/obj/${b.listing.number}`}>{b.listing.title}</a>, {b.listing.resort.name}</dd>
        <dt>Даты</dt><dd>{fmtRange(b.checkIn, b.checkOut)}</dd>
        <dt>Гости</dt><dd>{b.adults} взр.{b.children ? `, ${b.children} дет.` : ""}</dd>
        <dt>Стоимость</dt><dd className="num">≈ {rub(b.totalEstimate)}{b.prepayAmount ? `, предоплата ${rub(b.prepayAmount)}` : ""}</dd>
        <dt>Гость</dt><dd>{b.guestName}, {b.guestEmail}{b.guestPhone ? `, ${b.guestPhone}` : ""}</dd>
      </dl>
    </div>
  );
}

export function Chat({ b, me, k }: { b: B; me: "guest" | "owner" | "staff"; k?: string | null }) {
  const send = postMessage.bind(null, b.number, k ?? null);
  return (
    <div className="card-box stack">
      <b>Переписка</b>
      <div className="chat">
        <div className="msg sys">Заявка создана</div>
        {b.messages.map(m => <div key={m.id} className={`msg ${m.isSystem ? "sys" : (m.fromOwner ? me === "owner" : me === "guest") ? "me" : "them"}`}>{m.text}</div>)}
      </div>
      {me !== "staff" && <form action={send} className="row chat-form"><textarea className="input" id="chat-text" name="text" placeholder="Сообщение" rows={2} style={{ flex: 1 }} required /><button className="btn">Отправить</button></form>}
    </div>
  );
}
