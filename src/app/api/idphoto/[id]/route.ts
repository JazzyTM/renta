import { getUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { readIdDoc } from "@/lib/idcheck";

// Фото документа: только для модераторов, без кеширования
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getUser();
  if (!me || !isStaff(me.role)) return new Response("forbidden", { status: 403 });
  const u = await db.user.findUnique({ where: { id: (await params).id }, select: { idDocPath: true } });
  if (!u?.idDocPath) return new Response("not found", { status: 404 });
  const buf = await readIdDoc(u.idDocPath).catch(() => null);
  if (!buf) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
