// Сквозной прогон «Наберегу»: хозяин → объявление → гость → заявка → ответ → отзыв → модерация.
// Запуск на сервере от root: node run.mjs. Ходит на http://127.0.0.1 (локальный nginx).
// Тестовые аккаунты: e2e-*@example.test, пароли генерируются и нигде не печатаются.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const BASE = "http://127.0.0.1";
const OUT = "/opt/e2e/out";
mkdirSync(OUT, { recursive: true });
const ts = Date.now().toString(36);
const pass = () => randomBytes(9).toString("base64url");
const owner = { name: "Тест Хозяин", email: `e2e-owner-${ts}@example.test`, password: pass() };
const guest = { name: "Тест Гость", email: `e2e-guest-${ts}@example.test`, password: pass() };
const adminFile = readFileSync("/root/renta-admin.txt", "utf8");
const admin = { email: adminFile.match(/Почта: (.+)/)[1].trim(), password: adminFile.match(/Пароль: (.+)/)[1].trim() };

const sql = (q) => execFileSync("sudo", ["-u", "postgres", "psql", "-d", "renta", "-tAc", q], { encoding: "utf8" }).trim();
const log = [];
const issues = [];
const step = (t) => { log.push(`\n## ${t}`); console.log("==", t); };
const note = (t) => { log.push(`- ${t}`); console.log("  ", t); };
const issue = (t) => { issues.push(t); log.push(`- ❗ ${t}`); console.log("  ❗", t); };

const browser = await chromium.launch();
async function ctx(name) {
  const c = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "ru-RU" });
  const p = await c.newPage();
  p.on("pageerror", (e) => issue(`[${name}] JS-ошибка на ${p.url()}: ${e.message.slice(0, 200)}`));
  p.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource.*(404)/.test(m.text())) issue(`[${name}] console.error на ${p.url()}: ${m.text().slice(0, 200)}`); });
  p.on("response", (r) => { if (r.status() >= 500) issue(`[${name}] ${r.status()} ${r.url()}`); });
  return { c, p };
}
let shot = 0;
const snap = async (p, name) => { shot++; await p.screenshot({ path: `${OUT}/${String(shot).padStart(2, "0")}-${name}.png`, fullPage: false }); };
const bodyHas = async (p, text, ms = 8000) => { try { await p.getByText(text, { exact: false }).first().waitFor({ timeout: ms }); return true; } catch { return false; } };

async function login(p, u) {
  await p.goto(`${BASE}/login`);
  await p.locator("#l-e").fill(u.email);
  await p.locator("#l-p").fill(u.password);
  await Promise.all([p.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 }).catch(() => {}), p.locator("form:has(#l-e) button.btn").click()]);
  if (new URL(p.url()).pathname.startsWith("/login")) issue(`вход ${u.email}: не ушли со страницы входа (${(await p.locator(".err").textContent().catch(() => "")) || "без ошибки"})`);
  else note(`вход ${u.email.split("@")[0]}: ок → ${new URL(p.url()).pathname}`);
}

async function register(p, u, isOwner) {
  await p.goto(`${BASE}/register`);
  await p.locator("#r-n").fill(u.name);
  await p.locator("#r-e").fill(u.email);
  await p.locator("#r-p").fill(u.password);
  if (isOwner) await p.locator('input[name="owner"]').check();
  await p.locator('input[name="agree"]').check();
  await p.getByRole("button", { name: "Зарегистрироваться" }).click();
  const ok = await bodyHas(p, "письмо", 10000);
  note(`регистрация ${isOwner ? "хозяина" : "гостя"}: ${ok ? "показано сообщение о письме" : "НЕТ сообщения"}`);
  if (!ok) issue(`регистрация ${u.email}: не увидели подтверждения`);
  await snap(p, `register-${isOwner ? "owner" : "guest"}`);
  const n = sql(`update "User" set "emailVerified"=now() where email='${u.email}' returning id`);
  if (!n) issue(`пользователь ${u.email} не создан в базе`);
}

// ожидание сохранения формы ActionForm: появится .notice.ok или .err
async function submitForm(p, section, label) {
  const sec = p.locator("section.card-box").filter({ has: p.getByRole("heading", { name: section }) });
  await sec.getByRole("button", { name: label }).first().click();
  const res = await Promise.race([
    sec.locator(".err").first().waitFor({ timeout: 10000 }).then(async () => ({ err: await sec.locator(".err").first().textContent() })),
    p.waitForTimeout(2500).then(() => ({})),
  ]);
  if (res.err) issue(`шаг «${section}»: ${res.err}`); else note(`шаг «${section}»: сохранено`);
}

try {
  // ---------- Хозяин ----------
  step("Хозяин: регистрация и вход");
  const O = await ctx("хозяин");
  await register(O.p, owner, true);
  await login(O.p, owner);
  if (!new URL(O.p.url()).pathname.startsWith("/cabinet")) issue(`хозяин после входа попал на ${new URL(O.p.url()).pathname}, а не в кабинет`);

  step("Хозяин: новое объявление");
  await O.p.goto(`${BASE}/cabinet/new`);
  await O.p.locator("#n-t").fill(`Гостевой дом «Тест ${ts}»`);
  await O.p.locator("#n-type").selectOption("GUESTHOUSE");
  await O.p.locator("#n-r").selectOption("kabardinka");
  await Promise.all([O.p.waitForURL(/\/cabinet\/listings\//, { timeout: 15000 }).catch(() => {}), O.p.getByRole("button", { name: "Продолжить" }).click()]);
  const listingId = O.p.url().match(/listings\/([^/?#]+)/)?.[1];
  if (!listingId) throw new Error("не создалось объявление: " + O.p.url());
  note(`создан черновик ${listingId}`);
  await snap(O.p, "wizard-start");

  await O.p.locator('textarea[name="description"]').fill("Тестовый гостевой дом в пяти минутах от моря. Чистые номера с кондиционером, зелёный двор с беседкой и мангалом, рядом магазины и остановка. Хозяева встретят и всё покажут.");
  await O.p.locator('input[name="address"]').fill("ул. Мира, 12");
  await O.p.locator('input[name="seaDistance"]').fill("300");
  await submitForm(O.p, "Основное", "Сохранить и дальше");

  // фото: сгенерируем 3 картинки
  const sharp = (await import("/opt/renta/node_modules/sharp/lib/index.js")).default;
  const files = [];
  for (const [i, c] of [[1, "#3b82c4"], [2, "#e0a040"], [3, "#40a070"]]) {
    const f = `${OUT}/photo${i}.jpg`;
    await sharp({ create: { width: 1600, height: 1067, channels: 3, background: c } }).jpeg().toFile(f);
    files.push(f);
  }
  await O.p.getByRole("tab", { name: /Фото/ }).click();
  await O.p.locator('input[type="file"]').setInputFiles(files);
  await O.p.waitForTimeout(6000);
  const nPhotos = Number(sql(`select count(*) from "ListingPhoto" where "listingId"='${listingId}'`));
  note(`фото загружено: ${nPhotos} из 3`);
  if (nPhotos < 3) issue(`фото: загрузилось ${nPhotos} из 3`);
  await snap(O.p, "photos");

  await O.p.getByRole("tab", { name: /Цены/ }).click();
  for (const [m, v] of [[6, 3000], [7, 4000], [8, 4200], [9, 2800]]) await O.p.locator(`input[name="m${m}"]`).fill(String(v));
  await submitForm(O.p, "Цены за ночь по месяцам, ₽", "Сохранить и дальше");

  await O.p.getByRole("tab", { name: /Номера/ }).click();
  const roomForm = O.p.locator("section.card-box").filter({ has: O.p.getByRole("heading", { name: "Номера и категории" }) });
  await roomForm.locator('input[name="name"]').fill("Двухместный с балконом");
  await roomForm.locator('input[name="guests"]').fill("2");
  await roomForm.locator('input[name="count"]').fill("3");
  await roomForm.locator('input[name="price"]').fill("3000");
  await roomForm.getByRole("button", { name: "Добавить" }).click();
  await O.p.waitForTimeout(2000);
  note(`номеров: ${sql(`select count(*) from "Room" where "listingId"='${listingId}'`)}`);

  await O.p.getByRole("tab", { name: /Удобства/ }).click();
  const am = O.p.locator("section.card-box").filter({ has: O.p.getByRole("heading", { name: "Удобства и услуги" }) });
  for (const t of ["Кондиционер", "Wi‑Fi", "Парковка", "Подходит для детей"]) await am.getByLabel(t, { exact: true }).check().catch(() => issue(`удобство «${t}» не найдено`));
  await submitForm(O.p, "Удобства и услуги", "Сохранить и дальше");

  await O.p.getByRole("tab", { name: /Правила/ }).click();
  await O.p.locator('input[name="contactPhone"]').fill("+7 918 111-22-33");
  await O.p.locator('input[name="contactName"]').fill("Тест");
  await submitForm(O.p, "Правила, предоплата и контакты", "Сохранить и дальше");

  await O.p.getByRole("tab", { name: /Публикация/ }).click();
  await snap(O.p, "publish-step");
  await O.p.getByRole("button", { name: "Опубликовать" }).first().click();
  await O.p.waitForTimeout(3000);
  const st = sql(`select status||'/'||moderation||'/'||number from "Listing" where id='${listingId}'`);
  note(`после «Опубликовать»: ${st}`);
  if (!st.startsWith("PUBLISHED")) issue(`публикация не прошла: ${st}; на странице: ${(await O.p.locator(".err, .notice").allTextContents()).join(" | ")}`);
  const number = st.split("/")[2];
  await snap(O.p, "published");

  // ---------- Гость ----------
  step("Гость: страница объявления и заявка без входа");
  const G = await ctx("гость");
  await G.p.goto(`${BASE}/obj/${number}?ci=2027-07-10&co=2027-07-15&adults=2`);
  note(`ЧПУ: ${new URL(G.p.url()).pathname}`);
  await snap(G.p, "listing-guest");
  const priceShown = await bodyHas(G.p, "₽", 3000);
  if (!priceShown) issue("на странице объявления нет цены");
  await G.p.getByRole("button", { name: "Отправить заявку" }).first().click();
  await G.p.locator("#b-name").fill(guest.name);
  await G.p.locator("#b-email").fill(guest.email);
  await G.p.locator("#b-phone").fill("+7 900 555-44-33");
  await G.p.locator("#b-comment").fill("Здравствуйте! Хотим приехать вдвоём, есть ли номер с балконом?");
  await snap(G.p, "request-modal");
  await Promise.all([G.p.waitForURL(/\/b\/\d+/, { timeout: 15000 }).catch(() => {}), G.p.locator(".modal").getByRole("button", { name: /Отправить заявку/ }).click()]);
  const bm = G.p.url().match(/\/b\/(\d+)\?k=([^&]+)/);
  if (!bm) { issue(`заявка не отправилась, адрес ${G.p.url()}; ошибки: ${(await G.p.locator(".err").allTextContents()).join(" | ")}`); throw new Error("stop"); }
  const [, bnum, bkey] = bm;
  note(`заявка №${bnum} создана, гость видит страницу заявки`);
  await snap(G.p, "booking-guest");
  const ownerNotif = sql(`select count(*) from "Notification" n join "User" u on u.id=n."userId" where u.email='${owner.email}'`);
  note(`уведомлений у хозяина: ${ownerNotif}`);
  if (ownerNotif === "0") issue("хозяину не пришло уведомление о заявке");

  // ---------- Хозяин отвечает ----------
  step("Хозяин: подтверждает заявку и пишет гостю");
  await O.p.goto(`${BASE}/cabinet/bookings`);
  await snap(O.p, "owner-bookings");
  await O.p.goto(`${BASE}/cabinet/bookings/${bnum}`);
  await O.p.locator('input[name="prepay"]').fill("3000");
  await O.p.locator('textarea[name="text"]').first().fill("Здравствуйте! Номер с балконом свободен, ждём вас.");
  await O.p.getByRole("button", { name: /Подтвердить/ }).first().click();
  await O.p.waitForTimeout(3000);
  const bst = sql(`select status from "Booking" where number=${bnum}`);
  note(`статус заявки: ${bst}`);
  if (bst !== "ACCEPTED") issue(`подтверждение заявки не сработало: ${bst}`);
  await O.p.locator("#chat-text").fill("Напишите, во сколько приедете.");
  await O.p.locator(".chat-form button").click();
  await O.p.waitForTimeout(2000);
  await snap(O.p, "owner-booking");

  step("Гость: видит ответ и пишет в переписке");
  await G.p.goto(`${BASE}/b/${bnum}?k=${bkey}`);
  if (!(await bodyHas(G.p, "Номер с балконом свободен"))) issue("гость не видит сообщение хозяина");
  else note("гость видит сообщение хозяина");
  await G.p.locator("#chat-text").fill("Приедем к 15:00, спасибо!");
  await G.p.locator(".chat-form button").click();
  await G.p.waitForTimeout(2000);
  const msgs = sql(`select count(*) from "Message" m join "Booking" b on b.id=m."bookingId" where b.number=${bnum}`);
  note(`сообщений в заявке: ${msgs}`);

  step("Хозяин: предоплата получена, гость выехал");
  await O.p.goto(`${BASE}/cabinet/bookings/${bnum}`);
  await O.p.getByRole("button", { name: "Предоплата получена" }).click();
  await O.p.waitForTimeout(2000);
  const busy = sql(`select count(*) from "BusyDate" b join "Listing" l on l.id=b."listingId" where l.number=${number}`);
  note(`занятых дат в календаре после предоплаты: ${busy}`);
  if (busy === "0") issue("после предоплаты даты не заняты в календаре");
  // переносим поездку в прошлое, чтобы можно было оставить отзыв
  sql(`update "Booking" set "checkIn"=current_date-6, "checkOut"=current_date-1 where number=${bnum}`);
  await O.p.goto(`${BASE}/cabinet/bookings/${bnum}`);
  await O.p.getByRole("button", { name: "Гость выехал" }).click().catch(() => issue("нет кнопки «Гость выехал»"));
  await O.p.waitForTimeout(2000);
  note(`статус: ${sql(`select status from "Booking" where number=${bnum}`)}`);

  step("Гость: отзыв");
  await G.p.goto(`${BASE}/b/${bnum}?k=${bkey}`);
  await snap(G.p, "guest-review-form");
  const rv = G.p.locator('textarea[name="text"]').last();
  if (await rv.count()) {
    await G.p.locator('select[name="rating"]').selectOption("5");
    await rv.fill("Отличное место, чисто и уютно, до моря близко. Хозяева приветливые, приедем ещё.");
    await G.p.getByRole("button", { name: /Оставить отзыв|Отправить отзыв|Отправить/ }).last().click();
    await G.p.waitForTimeout(2500);
  } else issue("у гостя нет формы отзыва после поездки");
  const rcount = sql(`select r.status from "Review" r join "Booking" b on b.id=r."bookingId" where b.number=${bnum}`);
  note(`отзыв в базе: ${rcount || "нет"}`);
  if (!rcount) issue("отзыв не сохранился");

  // ---------- Админ ----------
  step("Админ: модерация объявления и отзыва");
  const A = await ctx("админ");
  await login(A.p, admin);
  await A.p.goto(`${BASE}/admin`);
  await snap(A.p, "admin-home");
  await A.p.goto(`${BASE}/admin/moderation`);
  await snap(A.p, "admin-moderation");
  const modRow = A.p.locator(".card-box, tr").filter({ hasText: `Тест ${ts}` }).first();
  if (await modRow.count()) {
    await modRow.getByRole("button", { name: /Одобрить|Принять|Проверено/ }).first().click().catch(() => issue("в модерации нет кнопки одобрения"));
    await A.p.waitForTimeout(2000);
  } else issue("тестового объявления нет в модерации");
  note(`модерация объявления: ${sql(`select moderation from "Listing" where id='${listingId}'`)}`);
  await A.p.goto(`${BASE}/admin/reviews`);
  const revRow = A.p.locator(".card-box").filter({ hasText: "Отличное место, чисто" }).first();
  if (await revRow.count()) { await revRow.getByRole("button", { name: "Опубликовать" }).click(); await A.p.waitForTimeout(2000); }
  else issue("отзыва нет в админке на проверке");
  note(`отзыв: ${sql(`select r.status from "Review" r join "Booking" b on b.id=r."bookingId" where b.number=${bnum}`)}; рейтинг объявления: ${sql(`select "ratingAvg"||' ('||"ratingCount"||')' from "Listing" where id='${listingId}'`)}`);
  await G.p.goto(`${BASE}/obj/${number}`);
  if (await bodyHas(G.p, "Отличное место, чисто")) note("отзыв виден на странице объявления"); else issue("опубликованный отзыв не виден на странице");
  await snap(G.p, "listing-with-review");

  step("Поиск: объявление в выдаче курорта");
  await G.p.goto(`${BASE}/kurort/kabardinka`);
  if (await bodyHas(G.p, `Тест ${ts}`)) note("объявление есть в выдаче Кабардинки"); else issue("объявления нет в выдаче курорта");
  // даты поездки гостя заняты (BusyDate после «Предоплата получена») — объект не должен показываться
  sql(`insert into "BusyDate"("listingId",date,source) select '${listingId}', d::date, 'booking' from generate_series('2027-07-10'::date,'2027-07-14'::date,'1 day') d on conflict do nothing`);
  await G.p.goto(`${BASE}/kurort/kabardinka?ci=2027-07-10&co=2027-07-15`);
  await G.p.waitForTimeout(2000);
  const shownBusy = await G.p.getByText(`Тест ${ts}`).count();
  note(`выдача на занятые даты: вариантов ${await G.p.locator(".lrow").count()}, тестовый объект ${shownBusy ? "ПОКАЗАН" : "скрыт"}`);
  if (shownBusy) issue("занятый объект показывается в поиске на свои даты");
  await G.p.goto(`${BASE}/kurort/kabardinka?ci=2027-08-10&co=2027-08-15`);
  await G.p.waitForTimeout(2000);
  if (!(await G.p.getByText(`Тест ${ts}`).count())) issue("объект не виден на свободные даты");
  else note("на свободные даты объект виден");

  writeFileSync(`${OUT}/state.json`, JSON.stringify({ listingId, number, bnum, owner: owner.email, guest: guest.email }));
} catch (e) {
  issue(`прогон остановился: ${e.message}`);
} finally {
  await browser.close();
  writeFileSync(`${OUT}/report.md`, `# Прогон ${new Date().toISOString()}\n${log.join("\n")}\n\n## Итого проблем: ${issues.length}\n${issues.map((x) => `- ${x}`).join("\n")}\n`);
  console.log(`\nПРОБЛЕМ: ${issues.length}`);
}
