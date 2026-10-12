import { notFound } from "next/navigation";
import { RichText } from "@/components/RichText";
import { db } from "@/lib/db";

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P) {
  const p = await db.page.findUnique({ where: { slug: (await params).slug } });
  return p ? { title: p.seoTitle || p.title, description: p.seoDescription ?? undefined } : {};
}
export default async function Page({ params }: P) {
  const p = await db.page.findUnique({ where: { slug: (await params).slug } });
  if (!p || !p.isPublished) notFound();
  return <main className="wrap" style={{ paddingBlock: 28, maxWidth: 820 }}><h1 className="h1">{p.title}</h1><div style={{ marginTop: 16 }}><RichText text={p.body} /></div></main>;
}
