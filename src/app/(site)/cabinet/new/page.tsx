import { db } from "@/lib/db";
import { LISTING_TYPES } from "@/lib/labels";
import { ActionForm } from "@/components/Forms";
import { createListing } from "@/lib/listing-actions";
import { importListing } from "@/lib/owner-tools";

export default async function NewListing() {
  const resorts = await db.resort.findMany({ where: { isActive: true }, include: { region: true }, orderBy: [{ region: { sort: "asc" } }, { sort: "asc" }] });
  const byRegion = new Map<string, typeof resorts>();
  for (const r of resorts) { if (!byRegion.has(r.region.name)) byRegion.set(r.region.name, []); byRegion.get(r.region.name)!.push(r); }
  const typeSel = (id: string) => <div className="field"><label htmlFor={id}>Тип жилья</label><select className="input" id={id} name="type">{Object.entries(LISTING_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>;
  const resortSel = (id: string) => <div className="field"><label htmlFor={id}>Курорт</label><select className="input" id={id} name="resort" required defaultValue=""><option value="" disabled>Выберите</option>
    {[...byRegion].map(([g, list]) => <optgroup key={g} label={g}>{list.map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}</optgroup>)}</select></div>;
  return (
    <div className="stack newlisting">
      <h1 className="h1">Новый объект</h1>
      <div className="nl-grid">
        <section className="card-box stack">
          <h2 className="h2">Заполнить с нуля</h2>
          <p className="small muted">Начните с главного. Фото, цены и удобства добавите на следующих шагах.</p>
          <ActionForm action={createListing} submit="Продолжить">
            <div className="field"><label htmlFor="n-t">Название</label><input className="input" id="n-t" name="title" placeholder="Гостевой дом «Лаванда»" required /></div>
            {typeSel("n-type")}
            {resortSel("n-r")}
          </ActionForm>
        </section>
        <section className="card-box stack">
          <h2 className="h2">Перенести с другого сайта</h2>
          <p className="small muted">Вставьте ссылку на ваше объявление на другой площадке. Мы заберём название, описание и фото, остальное заполните сами. Некоторые сайты закрыты от автоматического чтения — тогда перенесите текст вручную.</p>
          <ActionForm action={importListing} submit="Перенести">
            <div className="field"><label htmlFor="i-u">Ссылка на объявление</label><input className="input" id="i-u" name="url" type="url" inputMode="url" placeholder="https://…" required /></div>
            {typeSel("i-type")}
            {resortSel("i-r")}
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
