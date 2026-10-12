import { db } from "@/lib/db";
import { toCard } from "@/lib/card";
import { cardInclude, visibleWhere } from "@/lib/queries";

// Карточки по списку id (избранное, «вы смотрели»)
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(x => /^[\w-]{1,40}$/.test(x)).slice(0, 60);
  if (!ids.length) return Response.json({ items: [] });
  const rows = await db.listing.findMany({ where: { AND: [await visibleWhere(), { id: { in: ids } }] }, include: cardInclude });
  const byId = new Map(rows.map(r => [r.id, r]));
  return Response.json({ items: ids.flatMap(id => { const r = byId.get(id); return r ? [toCard(r)] : []; }) });
}
