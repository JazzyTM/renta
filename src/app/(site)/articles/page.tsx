import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { SceneArt } from "@/components/Art";
import { thumb } from "@/lib/img";

export const metadata = { title: "Статьи об отдыхе у моря", description: "Советы, как выбрать курорт и жильё у моря, когда ехать и что взять с собой." };

export default async function Articles() {
  const list = await db.article.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" } });
  return (
    <main className="wrap textpage wide">
      <h1 className="h1">Статьи об отдыхе у моря</h1>
      {list.length ? <div className="arts">{list.map(a => (
        <Link key={a.id} href={`/articles/${a.slug}`} className="art">
          <div className="aph">{a.coverUrl ? <img src={thumb(a.coverUrl)} alt="" loading="lazy" /> : <SceneArt seed={a.slug} />}</div>
          <div className="atx"><b>{a.title}</b>{a.excerpt && <p>{a.excerpt}</p>}<span className="small muted">{fmtDate(a.publishedAt ?? a.createdAt)}</span></div>
        </Link>
      ))}</div> : <p className="muted">Статей пока нет.</p>}
    </main>
  );
}
