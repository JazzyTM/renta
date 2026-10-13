import { db } from "@/lib/db";
import { LISTING_TYPES, BEACH_TYPES, PREPAY, LISTING_STATUS, MODERATION } from "@/lib/labels";
import { MONTHS } from "@/lib/format";
import { ActionForm, ConfirmButton } from "./Forms";
import { PublishButton } from "./PublishButton";
import { PhotoManager } from "./PhotoManager";
import { ownerPlan } from "@/lib/plan";
import { getSettings } from "@/lib/settings";
import { Steps } from "./Steps";
import * as A from "@/lib/listing-actions";
import { sign } from "@/lib/sign";

export async function ListingEditor({ id }: { id: string }) {
  const [l, resorts, amenities] = await Promise.all([
    db.listing.findUniqueOrThrow({ where: { id }, include: { photos: { orderBy: { sort: "asc" } }, prices: true, rooms: true, amenities: true } }),
    db.resort.findMany({ include: { region: true }, orderBy: [{ region: { sort: "asc" } }, { sort: "asc" }] }),
    db.amenity.findMany({ orderBy: { sort: "asc" } }),
  ]);
  const price = (m: number) => l.prices.find(p => p.month === m)?.price ?? "";
  const has = new Set(l.amenities.map(a => a.amenityId));
  const groups = new Map<string, typeof amenities>();
  for (const a of amenities) { if (!groups.has(a.group)) groups.set(a.group, []); groups.get(a.group)!.push(a); }
  const [st, stTone] = LISTING_STATUS[l.status], [md, mdTone] = MODERATION[l.moderation];
  const [s, plan] = await Promise.all([getSettings(), ownerPlan(l.ownerId)]);
  const wizard = l.status === "DRAFT";
  const sv = wizard ? "Сохранить и дальше" : "Сохранить";
  const minPh = Number(s.minPhotos) || 0, minDesc = Number(s.minDescription) || 0;
  const checks: [string, boolean, string][] = [
    ["Основное", l.description.trim().length >= minDesc && !!l.address, `описание от ${minDesc} знаков и адрес`],
    ["Фото", l.photos.length >= minPh, `не меньше ${minPh} фото`],
    ["Цены", l.prices.some(p => p.price > 0), "цена хотя бы на один месяц"],
    ["Номера", true, "необязательно"],
    ["Удобства", l.amenities.length > 0, "отметьте, что есть"],
    ["Правила и контакты", !!l.contactPhone, "телефон для гостей"],
  ];

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="card-box row between">
        <div className="row"><span className={`tag ${stTone}`}>{st}</span><span className={`tag ${mdTone}`}>{md}</span>
          {l.moderationNote && <span className="small muted">Комментарий модератора: {l.moderationNote}</span>}</div>
        <div className="row">
          <a className="btn ghost sm" href={`/obj/${l.number}`} target="_blank">Открыть на сайте</a>
          {l.status === "PUBLISHED" ? <form action={A.setStatus.bind(null, id, "HIDDEN")}><button className="btn ghost sm">Скрыть</button></form> : <PublishButton id={id} />}
        </div>
      </div>

      <Steps wizard={wizard} titles={[...checks.map(c => c[0]), "Публикация"]} done={[...checks.map(c => c[1]), l.status === "PUBLISHED"]}>
      <section className="card-box stack"><h2 className="h2">Основное</h2>
        <ActionForm action={A.saveMain.bind(null, id)} submit={sv}>
          <div className="grid2">
            <div className="field"><label>Название</label><input className="input" name="title" defaultValue={l.title} required /></div>
            <div className="field"><label>Тип жилья</label><select className="input" name="type" defaultValue={l.type}>{Object.entries(LISTING_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <div className="field"><label>Курорт</label><select className="input" name="resortId" defaultValue={l.resortId}>{resorts.map(r => <option key={r.id} value={r.id}>{r.region.name}: {r.name}</option>)}</select></div>
          <div className="field"><label>Описание</label><textarea className="input" name="description" defaultValue={l.description} rows={8} placeholder="Чем хорош объект, как дойти до моря, что рядом" /></div>
          <div className="field"><label>Адрес</label><input className="input" name="address" defaultValue={l.address} /></div>
          <div className="grid3">
            <div className="field"><label>Широта</label><input className="input" name="lat" defaultValue={l.lat ?? ""} placeholder="44.56" /></div>
            <div className="field"><label>Долгота</label><input className="input" name="lng" defaultValue={l.lng ?? ""} placeholder="38.08" /></div>
            <div className="field"><label>До моря, м</label><input className="input" name="seaDistance" type="number" defaultValue={l.seaDistance ?? ""} /></div>
          </div>
          <div className="grid3">
            <div className="field"><label>Пляж</label><select className="input" name="beachType" defaultValue={l.beachType ?? ""}><option value="">Не указан</option>{Object.entries(BEACH_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="field"><label>Гостей максимум</label><input className="input" name="maxGuests" type="number" min={1} defaultValue={l.maxGuests} /></div>
            <div className="field"><label>Гостей в базовой цене</label><input className="input" name="baseGuests" type="number" min={1} defaultValue={l.baseGuests} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label>Доплата за доп. гостя в ночь, ₽</label><input className="input" name="extraGuestPrice" type="number" min={0} defaultValue={l.extraGuestPrice} /></div>
            <div className="field"><label>Минимум ночей</label><input className="input" name="minNights" type="number" min={1} defaultValue={l.minNights} /></div>
          </div>
        </ActionForm></section>

      <section className="card-box stack"><h2 className="h2">Фото</h2>
        <PhotoManager listingId={id} photos={l.photos.map(p => ({ id: p.id, url: p.url }))} max={plan.maxPhotos} /></section>

      <section className="card-box stack"><h2 className="h2">Цены за ночь по месяцам, ₽</h2>
        <ActionForm action={A.savePrices.bind(null, id)} submit={sv}>
          <div className="grid3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            {MONTHS.map((m, i) => <div className="field" key={m}><label>{m}</label><input className="input" type="number" min={0} step={100} name={`m${i + 1}`} defaultValue={price(i + 1)} /></div>)}
          </div><span className="hint">Пустой месяц означает, что в этот месяц объект не сдаётся.</span>
        </ActionForm></section>

      <section className="card-box stack"><h2 className="h2">Номера и категории</h2>
        {l.rooms.length > 0 && <div className="tablewrap"><table className="t"><thead><tr><th>Название</th><th>Гостей</th><th>Кол-во</th><th>Цена</th><th /></tr></thead><tbody>
          {l.rooms.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.guests}</td><td>{r.count}</td><td>{r.price}</td><td><form action={A.deleteRoom.bind(null, id, r.id)}><button className="link">Удалить</button></form></td></tr>)}</tbody></table></div>}
        <form action={A.addRoom.bind(null, id)} className="toolbar">
          <input className="input" name="name" placeholder="Например, Двухместный с балконом" required />
          <input className="input" name="guests" type="number" min={1} placeholder="Гостей" style={{ width: 90 }} />
          <input className="input" name="count" type="number" min={1} placeholder="Кол-во" style={{ width: 90 }} />
          <input className="input" name="price" type="number" min={0} placeholder="Цена" style={{ width: 110 }} />
          <button className="btn sm">Добавить</button>
        </form></section>

      <section className="card-box stack"><h2 className="h2">Удобства и услуги</h2>
        <ActionForm action={A.saveAmenities.bind(null, id)} submit={sv}>
          <div className="amenPick">{[...groups].map(([g, list]) => <fieldset key={g}><legend>{g}</legend>
            {list.map(a => <label className="check" key={a.id}><input type="checkbox" name="a" value={a.id} defaultChecked={has.has(a.id)} /> {a.name}</label>)}</fieldset>)}</div>
        </ActionForm></section>

      <section className="card-box stack"><h2 className="h2">Правила, предоплата и контакты</h2>
        <ActionForm action={A.saveRules.bind(null, id)} submit={sv}>
          <div className="grid3">
            <div className="field"><label>Предоплата</label><select className="input" name="prepayType" defaultValue={l.prepayType}>{Object.entries(PREPAY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="field"><label>Процент предоплаты</label><input className="input" name="prepayPercent" type="number" min={0} max={100} defaultValue={l.prepayPercent} /></div>
            <div className="field"><label>Бесплатная отмена за, дней</label><input className="input" name="cancelDays" type="number" min={0} defaultValue={l.cancelDays} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label>Заезд с</label><input className="input" name="checkInTime" type="time" defaultValue={l.checkInTime} /></div>
            <div className="field"><label>Выезд до</label><input className="input" name="checkOutTime" type="time" defaultValue={l.checkOutTime} /></div>
          </div>
          <div className="row"><label className="check"><input type="checkbox" name="childrenAllowed" defaultChecked={l.childrenAllowed} /> Можно с детьми</label>
            <label className="check"><input type="checkbox" name="petsAllowed" defaultChecked={l.petsAllowed} /> Можно с животными</label>
            <label className="check"><input type="checkbox" name="smokingAllowed" defaultChecked={l.smokingAllowed} /> Можно курить</label></div>
          <div className="grid2">
            <div className="field"><label>Телефон для гостей</label><input className="input" name="contactPhone" defaultValue={l.contactPhone} /></div>
            <div className="field"><label>Имя для гостей</label><input className="input" name="contactName" defaultValue={l.contactName} /></div>
          </div>
          <div className="grid2">
            <label className="check"><input type="checkbox" name="whatsapp" defaultChecked={l.whatsapp} /> Есть WhatsApp на этом номере</label>
            <div className="field"><label>Telegram</label><input className="input" name="telegram" defaultValue={l.telegram ?? ""} placeholder="@username" /></div>
          </div>
        </ActionForm></section>

      <section className="card-box stack"><h2 className="h2">Публикация</h2>
        <ul className="checklist">{checks.map(([t, ok, hint]) => <li key={t} className={ok ? "ok" : ""}><span>{ok ? "✓" : "○"}</span><b>{t}</b><span className="small muted">{hint}</span></li>)}</ul>
        {l.status === "PUBLISHED" ? <p>Объявление опубликовано. <a href={`/obj/${l.number}`} target="_blank">Открыть на сайте</a></p>
          : <><p className="muted">Когда всё готово, нажмите «Опубликовать». {s.postModeration ? "Объявление появится сразу, модератор проверит его позже." : "Объявление появится после проверки модератором."}</p><PublishButton id={id} /></>}
      </section>
      </Steps>

      <section className="card-box stack" id="calendar"><h2 className="h2">Календарь занятости</h2>
        <p className="small muted">Если сдаёте и на других сайтах (Авито, Суточно, Островок), вставьте ссылку на их календарь в формате .ics. Занятые даты будут видны гостям и обновляются каждые 3 часа.</p>
        <ActionForm action={A.saveIcal.bind(null, id)} submit="Сохранить и загрузить">
          <div className="field"><label htmlFor="ical">Ссылка на календарь .ics</label><input className="input" id="ical" name="icalUrl" defaultValue={l.icalUrl ?? ""} placeholder="https://…/calendar.ics" /></div>
          {l.icalUrl && <span className="small muted">{l.icalError ? `Ошибка: ${l.icalError}` : l.icalSyncedAt ? `Загружен ${l.icalSyncedAt.toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}` : ""}</span>}
        </ActionForm>
        <div className="field"><label htmlFor="ical-out">Наш календарь для других сайтов</label>
          <input className="input" id="ical-out" readOnly value={`${process.env.APP_URL || ""}/ical/${l.number}-${sign("ical" + l.id)}.ics`} />
          <span className="small muted">Вставьте эту ссылку на другой площадке, чтобы там закрывались даты подтверждённых здесь броней.</span></div>
      </section>

      {l.status !== "ARCHIVED" && <form action={A.setStatus.bind(null, id, "ARCHIVED")}><ConfirmButton message="Убрать объявление в архив? Его не будет видно на сайте.">Убрать в архив</ConfirmButton></form>}
    </div>
  );
}
