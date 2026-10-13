import { NextResponse } from "next/server";

// Ссылка-приглашение: запоминаем код на 30 дней и ведём на страницу «Сдать жильё»
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.replace(/[^a-f0-9]/g, "").slice(0, 16);
  const res = NextResponse.redirect(new URL("/cabinet/new", process.env.APP_URL || req.url));
  if (code) res.cookies.set("ref", code, { httpOnly: true, sameSite: "lax", maxAge: 30 * 86400, path: "/" });
  return res;
}
