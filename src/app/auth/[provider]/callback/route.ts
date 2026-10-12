import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { fetchProfile } from "@/lib/oauth";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const fail = NextResponse.redirect(new URL("/login?error=1", req.url));
  if (provider !== "vk" && provider !== "yandex") return fail;
  const jar = await cookies();
  let saved: { state: string; verifier: string; next: string };
  try { saved = JSON.parse(jar.get("oauth")?.value ?? ""); } catch { return fail; }
  jar.delete("oauth");
  if (!saved || saved.state !== url.searchParams.get("state")) return fail;
  try {
    const p = await fetchProfile(provider, url.searchParams, saved.verifier);
    const acc = await db.account.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId: p.id } } });
    let userId = acc?.userId;
    if (!userId) {
      const email = p.email?.toLowerCase();
      const existing = email ? await db.user.findUnique({ where: { email } }) : null;
      const u = existing ?? await db.user.create({ data: { email, emailVerified: email ? new Date() : null, name: p.name, avatarUrl: p.avatar } });
      await db.account.create({ data: { provider, providerAccountId: p.id, userId: u.id } });
      userId = u.id;
      await audit(u.id, existing ? "link_social" : "register_social", "User", u.id, { provider });
    }
    const u = await db.user.findUnique({ where: { id: userId } });
    if (!u || u.status === "BLOCKED") return fail;
    await createSession(u.id);
    const next = saved.next?.startsWith("/") && !saved.next.startsWith("//") ? saved.next : "/";
    return NextResponse.redirect(new URL(next, process.env.APP_URL || req.url));
  } catch (e) {
    console.error("oauth", e);
    return fail;
  }
}
