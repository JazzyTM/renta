import { db } from "@/lib/db";
import { allow } from "@/lib/guard";
import { clientIp } from "@/lib/guard";

// Активные тесты для посетителя
export async function GET() {
  const list = await db.experiment.findMany({ where: { isActive: true }, select: { key: true, variants: true, goal: true } });
  return Response.json(list.map(e => ({ key: e.key, goal: e.goal, variants: e.variants.split("|").map(v => v.trim()).filter(Boolean) })), { headers: { "Cache-Control": "public, max-age=60" } });
}

// Показ варианта или достигнутая цель
export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as { key?: string; variant?: number; kind?: string } | null;
  if (!b?.key || typeof b.variant !== "number" || !["view", "goal"].includes(b.kind ?? "")) return new Response(null, { status: 400 });
  if (!allow(`ab:${await clientIp()}`, 60, 3600)) return new Response(null, { status: 429 });
  const e = await db.experiment.findUnique({ where: { key: b.key } });
  if (!e?.isActive || b.variant < 0 || b.variant >= e.variants.split("|").length) return new Response(null, { status: 404 });
  await db.experimentEvent.create({ data: { key: b.key, variant: b.variant, kind: b.kind! } });
  return new Response(null, { status: 204 });
}
