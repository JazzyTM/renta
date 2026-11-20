import { searchListings, parseFilters, scopeWhere, priceHistogram, mapListings } from "@/lib/queries";
import { toCard } from "@/lib/card";

// Поиск без перезагрузки страницы: фильтры, сортировка, подгрузка следующих страниц
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp: Record<string, string | string[]> = {};
  for (const k of new Set(url.searchParams.keys())) { const v = url.searchParams.getAll(k); sp[k] = v.length > 1 ? v : v[0]; }
  const base = await scopeWhere({ resort: url.searchParams.get("_resort") || undefined, filter: url.searchParams.get("_filter") || undefined, region: url.searchParams.get("_region") || undefined });
  if (!base) return Response.json({ error: "not found" }, { status: 404 });
  const f = parseFilters(sp);
  // Режим карты: только точки, по видимой области или по всему курорту
  if (url.searchParams.get("_map")) {
    const b = (url.searchParams.get("bbox") ?? "").split(",").map(Number);
    const bbox = b.length === 4 && b.every(Number.isFinite) ? b as [number, number, number, number] : undefined;
    return Response.json({ points: await mapListings(base, f, bbox) });
  }
  const res = await searchListings(base, f);
  const hist = url.searchParams.get("_hist") ? await priceHistogram(base) : undefined;
  return Response.json({ items: res.items.map(toCard), total: res.total, page: res.page, pages: res.pages, hist });
}
