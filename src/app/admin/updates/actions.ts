"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { requestUpdate } from "@/lib/updates";
import type { FormState } from "@/lib/form";

export async function startUpdate(kind: "update" | "rollback" | "backup"): Promise<FormState> {
  const u = await requireAdmin();
  try { await requestUpdate(u.email ?? u.id, kind); }
  catch (e) { return { error: "Служба обновлений не установлена на этом сервере: " + (e as Error).message }; }
  await audit(u.id, "request:" + kind, "System");
  revalidatePath("/admin/updates"); revalidatePath("/admin/system");
  return { ok: kind === "backup" ? "Копия создаётся, обновите страницу через минуту" : "Запущено. Сайт перезапустится, обновите страницу через пару минут" };
}
