import { notFound } from "next/navigation";
import { bookingAccess } from "@/lib/booking";
import { BookingSummary, Chat } from "@/components/BookingView";
import { cancelBooking, leaveReview } from "../actions";
import { ActionForm } from "@/components/Forms";
import { db } from "@/lib/db";

export const metadata = { title: "Заявка", robots: { index: false } };

export default async function BookingPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ k?: string }> }) {
  const number = Number((await params).number), k = (await searchParams).k ?? null;
  const a = Number.isInteger(number) ? await bookingAccess(number, k) : null;
  if (!a) notFound();
  const { b } = a;
  const text: Record<string, string> = {
    NEW: "Заявка у хозяина. Он проверит, свободны ли даты, и ответит здесь и на почту.",
    ACCEPTED: "Даты свободны. Предоплату переводите только по реквизитам из переписки.",
    PREPAID: "Бронь подтверждена. Хорошего отдыха!",
    DECLINED: "Хозяин не сможет принять вас на эти даты.",
    CANCELLED: "Заявка отменена.", COMPLETED: "Поездка завершена.", NO_RESPONSE: "Хозяин не ответил. Посмотрите другие варианты.",
  };
  const canReview = a.role === "guest" && ["ACCEPTED", "PREPAID", "COMPLETED"].includes(b.status) && b.checkOut <= new Date() && !(await db.review.findUnique({ where: { bookingId: b.id } }));
  return (
    <main className="wrap" style={{ paddingBlock: 24, display: "grid", gap: 16, maxWidth: 820 }}>
      <h1 className="h1">{text[b.status]}</h1>
      <BookingSummary b={b} />
      <Chat b={b} me={a.role === "owner" ? "owner" : a.role === "staff" ? "staff" : "guest"} k={k} />
      {a.role === "guest" && ["NEW", "ACCEPTED"].includes(b.status) && <form action={cancelBooking.bind(null, b.number, k)}><button className="btn ghost">Отменить заявку</button></form>}
      {canReview && <div className="card-box stack"><b>Как прошла поездка?</b>
        <ActionForm action={leaveReview.bind(null, b.number, k)} submit="Оставить отзыв">
          <div className="field"><label>Оценка</label><select className="input" name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{"★".repeat(n)} {n}</option>)}</select></div>
          <div className="field"><label>Отзыв</label><textarea className="input" name="text" rows={4} placeholder="Что понравилось, что нет" /></div>
        </ActionForm></div>}
      {a.role === "guest" && <p className="small muted">Сохраните эту страницу: по ссылке из письма вы всегда сможете вернуться к переписке.</p>}
    </main>
  );
}
