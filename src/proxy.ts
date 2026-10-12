import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

// Редиректы из админки (раздел «Редиректы»). Кэш на минуту.
let cache: { at: number; map: Map<string, { to: string; permanent: boolean }> } | null = null;

async function redirects() {
  if (cache && Date.now() - cache.at < 60_000) return cache.map;
  const rows = await db.redirect.findMany().catch(() => []);
  cache = { at: Date.now(), map: new Map(rows.map(r => [r.from.replace(/\/$/, "") || "/", { to: r.to, permanent: r.permanent }])) };
  return cache.map;
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname.replace(/\/$/, "") || "/";
  const r = (await redirects()).get(path);
  if (r) return NextResponse.redirect(new URL(r.to, req.url), r.permanent ? 301 : 302);
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|uploads|api|admin|favicon.ico).*)"] };
