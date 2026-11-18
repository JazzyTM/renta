import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { listingNumber, listingPath } from "@/lib/paths";

// Редиректы из админки (раздел «Редиректы»). Кэш на минуту.
let cache: { at: number; map: Map<string, { to: string; permanent: boolean }> } | null = null;

async function redirects() {
  if (cache && Date.now() - cache.at < 60_000) return cache.map;
  const rows = await db.redirect.findMany().catch(() => []);
  cache = { at: Date.now(), map: new Map(rows.map(r => [r.from.replace(/\/$/, "") || "/", { to: r.to, permanent: r.permanent }])) };
  return cache.map;
}

// ЧПУ объявлений: настоящий 301 до отрисовки страницы (иначе из-за потоковой отдачи вышел бы 200)
async function listingRedirect(path: string) {
  const old = path.match(/^\/obj\/(\d+)$/);
  const m = old ? null : path.match(/^\/kurort\/([^/]+)\/([^/]+)$/);
  const num = old ? Number(old[1]) : m ? listingNumber(m[2]) : null;
  if (!num) return null;
  const l = await db.listing.findUnique({ where: { number: num }, select: { number: true, title: true, resort: { select: { slug: true } } } }).catch(() => null);
  if (!l) return null;
  const canonical = listingPath({ number: l.number, title: l.title, resortSlug: l.resort.slug });
  return canonical === path ? null : canonical;
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname.replace(/\/$/, "") || "/";
  const r = (await redirects()).get(path);
  if (r) return NextResponse.redirect(new URL(r.to, req.url), r.permanent ? 301 : 302);
  if (path.startsWith("/obj/") || path.startsWith("/kurort/")) {
    const to = await listingRedirect(path);
    if (to) {
      const url = new URL(to, req.url);
      url.search = req.nextUrl.search;
      return NextResponse.redirect(url, 301);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|uploads|api|admin|favicon.ico).*)"] };
