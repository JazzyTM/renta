import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUser, isStaff } from "@/lib/auth";
import { saveImage } from "@/lib/upload";
import { ownerPlan } from "@/lib/plan";

// Загрузка одного фото (страница отправляет файлы по одному, чтобы показывать прогресс)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getUser();
  const l = await db.listing.findUnique({ where: { id }, include: { _count: { select: { photos: true } } } });
  if (!u || !l || (l.ownerId !== u.id && !isStaff(u.role))) return Response.json({ error: "Нет доступа" }, { status: 403 });
  const max = (await ownerPlan(l.ownerId)).maxPhotos;
  if (l._count.photos >= max) return Response.json({ error: `Не больше ${max} фото` }, { status: 400 });
  const fd = await req.formData();
  const f = fd.get("photo");
  if (!(f instanceof File) || !f.size) return Response.json({ error: "Нет файла" }, { status: 400 });
  try {
    const url = await saveImage(f);
    const last = await db.listingPhoto.findFirst({ where: { listingId: id }, orderBy: { sort: "desc" } });
    const p = await db.listingPhoto.create({ data: { listingId: id, url, sort: (last?.sort ?? -1) + 1 } });
    revalidatePath(`/cabinet/listings/${id}`); revalidatePath(`/admin/listings/${id}`); revalidatePath(`/obj/${l.number}`);
    return Response.json({ id: p.id, url });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
