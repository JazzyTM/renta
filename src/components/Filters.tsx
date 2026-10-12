import { LISTING_TYPES } from "@/lib/labels";

type Amen = { code: string; name: string };

export function Filters({ action, sp, amenities }: { action: string; sp: Record<string, any>; amenities: Amen[] }) {
  const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []) as string[];
  const types = arr(sp.type), amen = arr(sp.amen);
  return (
    <form className="filters" action={action} method="get" aria-label="Фильтры">
      {["ci", "co", "adults", "children", "sort"].map(k => sp[k] ? <input key={k} type="hidden" name={k} value={sp[k]} /> : null)}
      <div className="fgroup"><span className="flabel">До моря</span>
        <select className="input" name="sea" defaultValue={sp.sea ?? ""}>
          <option value="">Любое расстояние</option><option value="100">до 100 м</option><option value="300">до 300 м</option><option value="500">до 500 м</option><option value="1000">до 1 км</option>
        </select></div>
      <div className="fgroup"><label className="flabel" htmlFor="f-price">Цена за ночь до, ₽</label><input className="input" id="f-price" name="price" type="number" step="500" min="0" defaultValue={sp.price ?? ""} /></div>
      <div className="fgroup"><span className="flabel">Тип жилья</span>
        {Object.entries(LISTING_TYPES).map(([k, v]) => <label key={k} className="check"><input type="checkbox" name="type" value={k} defaultChecked={types.includes(k)} /> {v}</label>)}</div>
      <div className="fgroup"><span className="flabel">Удобства</span>
        {amenities.map(a => <label key={a.code} className="check"><input type="checkbox" name="amen" value={a.code} defaultChecked={amen.includes(a.code)} /> {a.name}</label>)}</div>
      <div className="fgroup"><span className="flabel">Пляж</span>
        <select className="input" name="beach" defaultValue={sp.beach ?? ""}><option value="">Любой</option><option value="PEBBLE">Галька</option><option value="SAND">Песок</option><option value="MIXED">Песок и галька</option></select></div>
      <label className="check"><input type="checkbox" name="verified" value="1" defaultChecked={sp.verified === "1"} /> Только проверенные</label>
      <div className="row"><button className="btn" type="submit">Показать</button><a className="link" href={action}>Сбросить</a></div>
    </form>
  );
}
