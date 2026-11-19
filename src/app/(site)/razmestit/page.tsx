import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { LISTING_TYPES } from "@/lib/labels";
import { ActionForm } from "@/components/Forms";
import { Consent } from "@/components/Consent";
import { Honeypot } from "@/components/Honeypot";
import { startListing } from "@/lib/start-actions";

export const metadata = { title: "Сдать жильё у моря", description: "Разместите гостевой дом, квартиру или номера: гости звонят и пишут вам напрямую." };

const STEPS: [string, string, string][] = [
  ["M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-6h4v6", "Объект и контакты", "Название, курорт и как с вами связаться. Аккаунт создастся сам."],
  ["M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 100-8 4 4 0 000 8z", "Фото, цены, удобства", "Мастер проведёт по шагам. Всё сохраняется, можно продолжить позже."],
  ["M5 12.5l4.5 4.5L19 7", "Публикация", "После проверки объявление появится в поиске, гости будут звонить и писать вам напрямую."],
];

// Старт для хозяина без аккаунта: сразу первый шаг мастера
export default async function StartListing() {
  if (await getUser()) redirect("/cabinet/new");
  const resorts = await db.resort.findMany({ where: { isActive: true }, include: { region: true }, orderBy: [{ region: { sort: "asc" } }, { name: "asc" }] });
  const byRegion = new Map<string, typeof resorts>();
  for (const r of resorts) { if (!byRegion.has(r.region.name)) byRegion.set(r.region.name, []); byRegion.get(r.region.name)!.push(r); }
  return (
    <main className="gray"><div className="wrap startl">
      <div className="sl-main panel">
        <h1 className="h1">Сдать жильё</h1>
        <p className="muted">Займёт пару минут. Уже есть аккаунт? <Link href="/login?next=/cabinet/new">Войти</Link></p>
        <ActionForm action={startListing} submit="Продолжить" className="stack sl-form">
          <Honeypot />
          <fieldset>
            <legend>Ваш объект</legend>
            <div className="field"><label htmlFor="s-t">Название</label><input className="input" id="s-t" name="title" placeholder="Гостевой дом «Лаванда»" required minLength={3} maxLength={120} /></div>
            <div className="sl-two">
              <div className="field"><label htmlFor="s-type">Тип жилья</label><select className="input" id="s-type" name="type">{Object.entries(LISTING_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="field"><label htmlFor="s-r">Курорт</label><select className="input" id="s-r" name="resort" required defaultValue=""><option value="" disabled>Выберите</option>
                {[...byRegion].map(([g, list]) => <optgroup key={g} label={g}>{list.map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}</optgroup>)}</select></div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Как с вами связаться</legend>
            <div className="sl-two">
              <div className="field"><label htmlFor="s-n">Имя</label><input className="input" id="s-n" name="name" autoComplete="name" placeholder="Ирина" required /></div>
              <div className="field"><label htmlFor="s-p">Телефон для гостей</label><input className="input" id="s-p" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 900 000-00-00" required /></div>
            </div>
            <div className="sl-two">
              <div className="field"><label htmlFor="s-e">Почта</label><input className="input" id="s-e" name="email" type="email" autoComplete="email" placeholder="для входа и уведомлений" required /></div>
              <div className="field"><label htmlFor="s-pw">Придумайте пароль</label><input className="input" id="s-pw" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="не короче 8 символов" required /></div>
            </div>
          </fieldset>
          <Consent id="s-pd" />
        </ActionForm>
      </div>
      <aside className="sl-side">
        <h2 className="h2">Как это работает</h2>
        <ol className="sl-steps">{STEPS.map(([d, t, x], i) => <li key={t}>
          <span className="sl-i"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <div><b>{i + 1}. {t}</b><span>{x}</span></div></li>)}</ol>
        <p className="small muted">Без посредников: мы не берём комиссию с бронирований. Подробнее — <Link href="/p/owners">хозяевам</Link>.</p>
      </aside>
    </div></main>
  );
}
