import "server-only";
import { db } from "./db";
import { sendTemplate } from "./mail";

export async function notify(userId: string, title: string, body: string, link?: string) {
  await db.notification.create({ data: { userId, title, body, link } });
}

export async function notifyEmail(userId: string, key: string, vars: Record<string, string | number>, title: string, link?: string) {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return;
  await notify(userId, title, "", link);
  if (u.email) await sendTemplate(u.email, key, vars);
}
