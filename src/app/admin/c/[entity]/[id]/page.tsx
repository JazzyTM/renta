import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { CRUD, delegate, fieldOptions } from "@/lib/crud";
import { isoDate } from "@/lib/format";
import { ActionForm, ConfirmButton } from "@/components/Forms";
import { crudSave, crudDelete } from "../../../actions";

export default async function CrudEdit({ params, searchParams }: { params: Promise<{ entity: string; id: string }>; searchParams: Promise<{ saved?: string; err?: string }> }) {
  const { entity, id } = await params;
  const e = CRUD[entity];
  if (!e) notFound();
  if (e.adminOnly) await requireAdmin(); else await requireStaff();
  const sp = await searchParams;
  const isNew = id === "new";
  const row: any = isNew ? null : await delegate(e.model).findUnique({ where: { id } });
  if (!isNew && !row) notFound();
  const val = (k: string, def: unknown) => (row ? row[k] : def);
  const fields = await Promise.all(e.fields.map(async f => ({ ...f, opts: f.type === "select" ? await fieldOptions(f) : [] })));
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div className="small"><Link href={`/admin/c/${entity}`}>← {e.title}</Link></div>
      <div className="row between"><h1 className="h1">{isNew ? `Новый: ${e.one}` : row.name ?? row.title ?? row.code ?? row.word ?? row.from ?? "Редактирование"}</h1>
        {!isNew && e.publicUrl && <a className="btn ghost sm" href={e.publicUrl(row)} target="_blank">Открыть на сайте</a>}</div>
      {sp.saved && <div className="notice ok">Создано</div>}
      {sp.err === "used" && <div className="notice bad">Нельзя удалить: запись используется. Выключите её вместо удаления.</div>}
      <ActionForm action={crudSave.bind(null, entity, isNew ? null : id)}>
        {fields.map(f => {
          const v = val(f.key, f.def);
          const label = <label htmlFor={`f-${f.key}`}>{f.label}{f.required ? " *" : ""}</label>;
          const hint = f.hint && <span className="hint">{f.hint}</span>;
          if (f.type === "bool") return <label key={f.key} className="check"><input type="checkbox" name={f.key} defaultChecked={!!v} /> {f.label}</label>;
          if (f.type === "textarea" || f.type === "rich") return <div key={f.key} className="field">{label}<textarea className="input" id={`f-${f.key}`} name={f.key} rows={f.type === "rich" ? 14 : 3} defaultValue={v ?? ""} />{hint}</div>;
          if (f.type === "select") return <div key={f.key} className="field">{label}<select className="input" id={`f-${f.key}`} name={f.key} defaultValue={v ?? ""}>{f.opts.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>{hint}</div>;
          return <div key={f.key} className="field">{label}<input className="input" id={`f-${f.key}`} name={f.key} type={f.type === "int" ? "number" : f.type === "date" ? "date" : "text"} defaultValue={f.type === "date" ? (v ? isoDate(new Date(v)) : "") : v ?? ""} required={f.required} />{hint}</div>;
        })}
      </ActionForm>
      {!isNew && e.canDelete !== false && <form action={crudDelete.bind(null, entity, id)}><ConfirmButton className="btn danger sm" message="Удалить без возможности восстановить?">Удалить</ConfirmButton></form>}
    </div>
  );
}
