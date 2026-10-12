import { db } from "@/lib/db";
import { LISTING_TYPES } from "@/lib/labels";
import { ActionForm } from "@/components/Forms";
import { createListing } from "@/lib/listing-actions";

export default async function NewListing() {
  const resorts = await db.resort.findMany({ where: { isActive: true }, include: { region: true }, orderBy: [{ region: { sort: "asc" } }, { sort: "asc" }] });
  const byRegion = new Map<string, typeof resorts>();
  for (const r of resorts) { if (!byRegion.has(r.region.name)) byRegion.set(r.region.name, []); byRegion.get(r.region.name)!.push(r); }
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <h1 className="h1">Новый объект</h1>
      <p className="muted">Начните с главного. Фото, цены и удобства добавите на следующем шаге.</p>
      <ActionForm action={createListing} submit="Продолжить">
        <div className="field"><label htmlFor="n-t">Название</label><input className="input" id="n-t" name="title" placeholder="Гостевой дом «Лаванда»" required /></div>
        <div className="field"><label htmlFor="n-type">Тип жилья</label><select className="input" id="n-type" name="type">{Object.entries(LISTING_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="n-r">Курорт</label><select className="input" id="n-r" name="resort" required defaultValue=""><option value="" disabled>Выберите</option>
          {[...byRegion].map(([g, list]) => <optgroup key={g} label={g}>{list.map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}</optgroup>)}</select></div>
      </ActionForm>
    </div>
  );
}
