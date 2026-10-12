import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking";
import { BOOKING_STATUS } from "@/lib/labels";
import { BookingSummary, Chat } from "@/components/BookingView";
import { ActionForm } from "@/components/Forms";
import { bookingAdmin } from "../../actions";

export default async function AdminBooking({ params }: { params: Promise<{ number: string }> }) {
  await requireStaff();
  const number = Number((await params).number);
  const a = Number.isInteger(number) ? await bookingAccess(number) : null;
  if (!a) notFound();
  const { b } = a;
  return (
    <div className="stack" style={{ gap: 16, maxWidth: 860 }}>
      <div className="small"><Link href="/admin/bookings">← Заявки</Link></div>
      <BookingSummary b={b} />
      <div className="card-box stack"><b>Администратору</b>
        <ActionForm action={bookingAdmin.bind(null, number)}>
          <div className="field"><label>Статус</label><select className="input" name="status" defaultValue={b.status}>{Object.entries(BOOKING_STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div>
          <div className="field"><label>Заметка (видна только сотрудникам)</label><textarea className="input" name="adminNote" rows={2} defaultValue={b.adminNote ?? ""} /></div>
        </ActionForm>
        {b.ownerNote && <p className="small muted">Заметка хозяина: {b.ownerNote}</p>}
      </div>
      <Chat b={b} me="staff" />
    </div>
  );
}
