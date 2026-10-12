import { notFound } from "next/navigation";
import { RichText } from "@/components/RichText";
import { db } from "@/lib/db";
type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P) {
  const a = await db.article.findUnique({ where: { slug: (await params).slug } });
  return a ? { title: a.seoTitle || a.title, description: a.seoDescription || a.excerpt } : {};
}
export default async function Article({ params }: P) {
  const a = await db.article.findUnique({ where: { slug: (await params).slug } });
  if (!a || !a.isPublished) notFound();
  return <main className="wrap" style={{ paddingBlock: 28, maxWidth: 820 }}><h1 className="h1">{a.title}</h1>{a.coverUrl && <img src={a.coverUrl} alt="" style={{ borderRadius: 14, marginTop: 16 }} />}<div style={{ marginTop: 16 }}><RichText text={a.body} /></div></main>;
}
