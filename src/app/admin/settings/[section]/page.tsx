import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { SETTINGS, getSettings } from "@/lib/settings";
import { ImageField } from "@/components/admin/ImageField";
import { ActionForm } from "@/components/Forms";
import { settingsSave } from "../../actions";

export const metadata = { title: "Настройки" };

export default async function Settings({ params }: { params: Promise<{ section: string }> }) {
  await requireAdmin();
  const { section } = await params;
  const sec = SETTINGS.find(s => s.id === section);
  if (!sec) notFound();
  const v = await getSettings();
  return (
    <>
      <h1 className="h1">Настройки</h1>
      <div className="row">{SETTINGS.map(s => <Link key={s.id} className={`chip${s.id === section ? " on" : ""}`} href={`/admin/settings/${s.id}`}>{s.title}</Link>)}</div>
      <div className="card-box" style={{ maxWidth: 760 }}>
        <ActionForm action={settingsSave.bind(null, section)}>
          {sec.fields.map(f => {
            const hint = f.hint && <span className="hint">{f.hint}</span>;
            if (f.type === "bool") return <label key={f.key} className="check"><input type="checkbox" name={f.key} defaultChecked={!!v[f.key]} /> {f.label}</label>;
            if (f.type === "textarea") return <div key={f.key} className="field"><label>{f.label}</label><textarea className="input" name={f.key} rows={3} defaultValue={String(v[f.key] ?? "")} />{hint}</div>;
            if (f.type === "select") return <div key={f.key} className="field"><label>{f.label}</label><select className="input" name={f.key} defaultValue={String(v[f.key])}>{f.options!.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>{hint}</div>;
            if (f.type === "image") return <ImageField key={f.key} name={f.key} label={f.label} value={String(v[f.key] ?? "")} hint={f.hint} />;
            if (f.type === "password") return <div key={f.key} className="field"><label>{f.label}</label><input className="input" name={f.key} type="password" autoComplete="new-password" placeholder={v[f.key] ? "задан, оставьте пустым, чтобы не менять" : "не задан"} />{hint}</div>;
            return <div key={f.key} className="field"><label>{f.label}</label><input className="input" name={f.key} type={f.type === "number" ? "number" : "text"} defaultValue={String(v[f.key] ?? "")} />{hint}</div>;
          })}
        </ActionForm>
      </div>
      {section === "auth" && <p className="small muted">Адреса для возврата после входа: {process.env.APP_URL || "https://ваш-домен"}/auth/vk/callback и /auth/yandex/callback</p>}
    </>
  );
}
