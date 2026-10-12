import { searchListings, parseFilters, scopeWhere, priceHistogram } from "@/lib/queries";
import { toCard } from "@/lib/card";

// Поиск без перезагрузки страницы: фильтры, сортировка, подгрузка следующих страниц
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp: Record<string, string | string[]> = {};
  for (const k of new Set(url.searchParams.keys())) { const v = url.searchParams.getAll(k); sp[k] = v.length > 1 ? v : v[0]; }
  const base = await scopeWhere({ resort: url.searchParams.get("_resort") || undefined, filter: url.searchParams.get("_filter") || undefined });
  if (!base) return Response.json({ error: "not found" }, { status: 404 });
  const f = parseFilters(sp);
  const res = await searchListings(base, f);
  const hist = url.searchParams.get("_hist") ? await priceHistogram(base) : undefined;
  return Response.json({ items: res.items.map(toCard), total: res.total, page: res.page, pages: res.pages, hist });
}
