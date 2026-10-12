import Link from "next/link";
import { db } from "@/lib/db";
export const metadata = { title: "Статьи об отдыхе у моря" };
export default async function Articles() {
  const list = await db.article.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" } });
  return <main className="wrap" style={{ paddingBlock: 28 }}><h1 className="h1" style={{ marginBottom: 16 }}>Статьи</h1>
    {list.length ? <div className="cards">{list.map(a => <Link key={a.id} href={`/articles/${a.slug}`} className="lcard">{a.coverUrl && <div className="ph"><img src={a.coverUrl} alt="" /></div>}<div className="t"><b>{a.title}</b><span className="small muted">{a.excerpt}</span></div></Link>)}</div> : <p className="muted">Статей пока нет.</p>}</main>;
}
