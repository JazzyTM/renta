import { notFound } from "next/navigation";
import { ogMeta } from "@/lib/og";
import { getSettings } from "@/lib/settings";
import { RichText } from "@/components/RichText";
import { db } from "@/lib/db";
import { fillLegal } from "@/lib/legal";

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P) {
  const p = await db.page.findUnique({ where: { slug: (await params).slug } });
  if (!p) return {};
  const s = await getSettings();
  return { title: p.seoTitle || p.title, description: p.seoDescription ?? undefined, ...ogMeta({ title: p.title, description: p.seoDescription, path: `/p/${p.slug}`, image: "/og/home", siteName: String(s.siteName) }) };
}
export default async function Page({ params }: P) {
  const p = await db.page.findUnique({ where: { slug: (await params).slug } });
  if (!p || !p.isPublished) notFound();
  return <main className="wrap textpage"><article className="panel prose-panel"><h1 className="h1">{p.title}</h1><div style={{ marginTop: 16 }}><RichText text={await fillLegal(p.body, p.updatedAt)} /></div></article></main>;
}
