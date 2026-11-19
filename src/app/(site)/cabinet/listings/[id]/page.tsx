import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, isStaff } from "@/lib/auth";
import { ListingEditor } from "@/components/ListingEditor";
import { Promote } from "@/components/Promote";

export default async function EditListing({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ imported?: string; welcome?: string }> }) {
  const { id } = await params;
  const { imported, welcome } = await searchParams;
  const u = await requireUser(`/cabinet/listings/${id}`);
  const l = await db.listing.findUnique({ where: { id }, select: { ownerId: true, title: true, status: true } });
  if (!l || (l.ownerId !== u.id && !isStaff(u.role))) notFound();
  return (
    <>
      <div className="small"><Link href="/cabinet">← Мои объекты</Link></div>
      <h1 className="h1">{l.title}</h1>
      {imported !== undefined && <div className="notice ok">Объявление перенесено: название и описание{Number(imported) > 0 ? `, фото: ${imported}` : ", фото не удалось скачать — добавьте их ниже"}. Проверьте текст, курорт и адрес, затем пройдите остальные шаги.</div>}
      {welcome !== undefined && <div className="notice ok">Аккаунт создан, вы вошли. Заполните объявление по шагам: всё сохраняется, можно продолжить позже из кабинета. Гостям оно станет видно после публикации.</div>}
      <ListingEditor id={id} />
      {l.status === "PUBLISHED" && <Promote listingId={id} />}
    </>
  );
}
