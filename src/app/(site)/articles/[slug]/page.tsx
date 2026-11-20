import Link from "next/link";
import { ogMeta } from "@/lib/og";
import { getSettings } from "@/lib/settings";
import { ShareButton } from "@/components/Share";
import { notFound } from "next/navigation";
import { RichText } from "@/components/RichText";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { thumb } from "@/lib/img";

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P) {
  const a = await db.article.findUnique({ where: { slug: (await params).slug } });
  if (!a) return {};
  const s = await getSettings();
  return { title: a.seoTitle || a.title, description: a.seoDescription || a.excerpt, ...ogMeta({ title: a.title, description: a.seoDescription || a.excerpt, path: `/articles/${a.slug}`, image: `/og/a/${a.slug}`, siteName: String(s.siteName), type: "article" }) };
}

export default async function Article({ params }: P) {
  const a = await db.article.findUnique({ where: { slug: (await params).slug } });
  if (!a || !a.isPublished) notFound();
  const more = await db.article.findMany({ where: { isPublished: true, id: { not: a.id } }, orderBy: { publishedAt: "desc" }, take: 3 });
  return (
    <main className="wrap textpage">
      <nav className="crumbs" aria-label="Навигация"><Link href="/">Главная</Link><span>/</span><Link href="/articles">Статьи</Link></nav>
      <article className="panel prose-panel">
        <h1 className="h1">{a.title}</h1>
        <div className="row between art-meta"><span className="small muted">{fmtDate(a.publishedAt ?? a.createdAt)}</span><ShareButton title={a.title} variant="chip" /></div>
        {a.coverUrl && <img className="acover" src={a.coverUrl} alt="" />}
        <RichText text={a.body} />
      </article>
      {more.length > 0 && <section className="stack">
        <h2 className="h2">Ещё статьи</h2>
        <div className="arts">{more.map(m => (
          <Link key={m.id} href={`/articles/${m.slug}`} className="art">
            {m.coverUrl && <div className="aph"><img src={thumb(m.coverUrl)} alt="" loading="lazy" /></div>}
            <div className="atx"><b>{m.title}</b>{m.excerpt && <p>{m.excerpt}</p>}</div>
          </Link>
        ))}</div>
      </section>}
    </main>
  );
}
