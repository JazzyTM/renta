import Link from "next/link";
import { db } from "@/lib/db";

export const metadata = { title: "Отписка", robots: { index: false } };

export default async function AlertOff({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await db.searchAlert.findUnique({ where: { token } });
  if (a?.isActive) await db.searchAlert.update({ where: { id: a.id }, data: { isActive: false } });
  return (
    <main className="gray"><div className="wrap" style={{ maxWidth: 600, paddingTop: 40, paddingBottom: 60 }}>
      <div className="panel">
        <h1 className="h2">{a ? "Вы отписались" : "Подписка не найдена"}</h1>
        <p className="muted">{a ? `Письма по поиску «${a.title}» больше не придут.` : "Возможно, она уже отключена."}</p>
        {a && <p><Link href={a.query}>Открыть этот поиск</Link></p>}
      </div>
    </div></main>
  );
}
