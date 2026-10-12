import { db } from "./db";

export async function audit(userId: string | null | undefined, action: string, entity: string, entityId?: string | null, data?: unknown) {
  await db.auditLog.create({ data: { userId: userId ?? null, action, entity, entityId: entityId ?? null, data: (data ?? undefined) as any } });
}
