import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { authorizeUrl, newVerifier } from "@/lib/oauth";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (provider !== "vk" && provider !== "yandex") return new Response("Not found", { status: 404 });
  const state = randomBytes(16).toString("base64url"), verifier = newVerifier();
  const url = await authorizeUrl(provider, state, verifier);
  if (!url) return NextResponse.redirect(new URL("/login?error=1", req.url));
  const next = new URL(req.url).searchParams.get("next") ?? "/";
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth", JSON.stringify({ state, verifier, next }), { httpOnly: true, sameSite: "lax", secure: (process.env.APP_URL ?? "").startsWith("https:"), maxAge: 600, path: "/" });
  return res;
}
