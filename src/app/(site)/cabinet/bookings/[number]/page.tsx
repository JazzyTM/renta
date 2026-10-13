import Link from "next/link";
import { notFound } from "next/navigation";
import { bookingAccess } from "@/lib/booking";
import { BookingSummary, Chat } from "@/components/BookingView";
import { ActionForm } from "@/components/Forms";
import { TemplatePicker } from "@/components/TemplatePicker";
import { db } from "@/lib/db";
import { fmtRange } from "@/lib/format";
import { acceptBooking, declineBooking, setBookingStatus, saveOwnerNote } from "../../actions";

export default async function OwnerBooking({ params }: { params: Promise<{ number: string }> }) {
  const number = Number((await params).number);
  const a = Number.isInteger(number) ? await bookingAccess(number) : null;
  if (!a || (a.role !== "owner" && a.role !== "staff")) notFound();
  const { b } = a;
  const open = ["NEW", "NO_RESPONSE"].includes(b.status);
  const templates = await db.replyTemplate.findMany({ where: { ownerId: b.listing.ownerId }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }], select: { id: true, title: true, text: true } });
  return (
    <div className="stack" style={{ gap: 16, maxWidth: 860 }}>
      <div className="small"><Link href="/cabinet/bookings">← Заявки</Link></div>
      <BookingSummary b={b} />
      {a.role === "owner" && <TemplatePicker list={templates} vars={{ "гость": b.guestName, "даты": fmtRange(b.checkIn, b.checkOut) }} />}
      {open && <div className="grid2">
        <div className="card-box stack"><b>Даты свободны</b>
          <ActionForm action={acceptBooking.bind(null, number)} submit="Подтвердить">
            <div className="field"><label>Предоплата, ₽</label><input className="input" name="prepay" type="number" min={0} defaultValue={b.prepayAmount} /></div>
            <div className="field"><label>Сообщение гостю</label><textarea className="input" name="text" rows={3} placeholder="Реквизиты для предоплаты, как добраться" /></div>
          </ActionForm></div>
        <div className="card-box stack"><b>Не получится</b>
          <ActionForm action={declineBooking.bind(null, number)} submit="Отклонить">
            <div className="field"><label>Причина для гостя</label><textarea className="input" name="text" rows={3} placeholder="Например: эти даты заняты, свободно с 20 июля" /></div>
          </ActionForm></div>
      </div>}
      {b.status === "ACCEPTED" && <div className="row">
        <form action={setBookingStatus.bind(null, number, "PREPAID")}><button className="btn okb">Предоплата получена</button></form>
        <ActionForm action={declineBooking.bind(null, number)} submit="Гость не оплатил, отменить" className="row"><input type="hidden" name="text" value="" /></ActionForm>
      </div>}
      {b.status === "PREPAID" && <div className="row">
        <form action={setBookingStatus.bind(null, number, "COMPLETED")}><button className="btn">Гость выехал</button></form>
        <form action={setBookingStatus.bind(null, number, "CANCELLED")}><button className="btn ghost">Отменить бронь</button></form>
      </div>}
      <Chat b={b} me={a.role === "owner" ? "owner" : "staff"} />
      <div className="card-box stack"><b>Заметка для себя</b>
        <ActionForm action={saveOwnerNote.bind(null, number)}><textarea className="input" name="note" rows={2} defaultValue={b.ownerNote ?? ""} placeholder="Гость не видит эту заметку" /></ActionForm></div>
    </div>
  );
}
