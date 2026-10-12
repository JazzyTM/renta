import Link from "next/link";

export function Pager({ page, pages, sp, path }: { page: number; pages: number; sp: Record<string, string | undefined>; path: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => path + "?" + new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>, page: String(p) });
  return (
    <div className="row small">
      {page > 1 && <Link className="chip" href={href(page - 1)}>← Назад</Link>}
      <span className="muted">Страница {page} из {pages}</span>
      {page < pages && <Link className="chip" href={href(page + 1)}>Дальше →</Link>}
    </div>
  );
}
