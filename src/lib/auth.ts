import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import type { Role, TokenType } from "@/generated/prisma/client";

const COOKIE = "sid";
const DAYS = 30;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  await db.session.create({
    data: { id: sha(token), userId, expiresAt: new Date(Date.now() + DAYS * 86400000), userAgent: h.get("user-agent")?.slice(0, 300), ip: h.get("x-forwarded-for")?.split(",").pop()?.trim() ?? null },
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: (process.env.APP_URL ?? "").startsWith("https:"), path: "/", maxAge: DAYS * 86400 });
}

export async function destroySession() {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (t) await db.session.deleteMany({ where: { id: sha(t) } });
  c.delete(COOKIE);
}

export const getUser = cache(async () => {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const s = await db.session.findUnique({ where: { id: sha(t) }, include: { user: true } });
  if (!s || s.expiresAt < new Date() || s.user.status === "BLOCKED") return null;
  return s.user;
});

export async function requireUser(next = "/") {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireRole(roles: Role[], next = "/admin") {
  const u = await requireUser(next);
  if (!roles.includes(u.role)) redirect("/");
  return u;
}

export const isStaff = (r?: Role | null) => r === "ADMIN" || r === "MODERATOR";

export async function createToken(userId: string, type: TokenType, hours: number) {
  const raw = randomBytes(24).toString("base64url");
  await db.token.create({ data: { userId, type, tokenHash: sha(raw), expiresAt: new Date(Date.now() + hours * 3600000) } });
  return raw;
}

export async function consumeToken(raw: string, type: TokenType) {
  const t = await db.token.findUnique({ where: { tokenHash: sha(raw) } });
  if (!t || t.type !== type || t.usedAt || t.expiresAt < new Date()) return null;
  await db.token.update({ where: { id: t.id }, data: { usedAt: new Date() } });
  return t.userId;
}

export const requireStaff = (next = "/admin") => requireRole(["ADMIN", "MODERATOR"], next);
export const requireAdmin = (next = "/admin") => requireRole(["ADMIN"], next);

// Выйти на всех устройствах, кроме текущего (после смены пароля)
export async function revokeOtherSessions(userId: string) {
  const t = (await cookies()).get(COOKIE)?.value;
  await db.session.deleteMany({ where: { userId, ...(t ? { id: { not: sha(t) } } : {}) } });
}
