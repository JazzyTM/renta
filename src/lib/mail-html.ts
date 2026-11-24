// Оформление писем: обычный текст шаблона → HTML в стиле сайта.
// Текст из админки остаётся простым, вид получается из его строк:
//   «Подпись: https://…» или строка-ссылка        → оранжевая кнопка
//   «Подпись: значение» (несколько строк подряд)  → таблица с деталями
//   «Комментарий: …», «Причина: …»                → выделенный блок с текстом
//   «Название\nhttps://…» (без двоеточия)         → карточка-ссылка (объявления в подписке)
//   «Отписаться: https://…»                       → ссылка в подвале
//   {code} в письме с кодом                       → крупный код

const C = { accent: "#F2543D", ink: "#131416", ink2: "#5B6169", line: "#E6E7EA", gray: "#F0F2F4", soft: "#FDECE8" };
const FONT = "Roboto,'Helvetica Neue',Arial,sans-serif";
const ONLY_URL = /^https?:\/\/\S+$/;

// Подписи кнопок, если в тексте шаблона подписи нет
const BUTTONS: Record<string, string> = {
  verify_email: "Подтвердить почту",
  password_reset: "Задать новый пароль",
  booking_new_owner: "Ответить гостю",
  booking_accepted_guest: "Открыть переписку",
  booking_declined_guest: "Посмотреть похожие",
  booking_message: "Ответить",
  listing_rejected: "Исправить объявление",
  listing_approved: "Открыть объявление",
  search_alert: "Все варианты",
  id_checked: "Открыть кабинет",
};
// Тексты блоков, которые показываем отдельной плашкой, а не строкой таблицы
const QUOTES = ["комментарий", "причина", "сообщение"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const linkify = (s: string) => esc(s).replace(/https?:\/\/[^\s<>&"«»]+/g, u => `<a href="${u}" style="color:${C.accent};text-decoration:underline;word-break:break-all">${u}</a>`);
const kv = (line: string) => { const m = line.match(/^([^:\n]{1,28}):\s*(.*)$/); return m && !/https?$/i.test(m[1]) && !/[.!?«]/.test(m[1]) ?{ k: m[1].trim(), v: m[2].trim() } : null; };

type Block =
  | { t: "p"; text: string }
  | { t: "btn"; label: string; url: string }
  | { t: "rows"; rows: { k: string; v: string }[] }
  | { t: "quote"; k: string; v: string }
  | { t: "card"; title: string; url: string }
  | { t: "code"; code: string };

function parse(key: string, body: string, vars: Record<string, string | number>) {
  const blocks: Block[] = [];
  let unsubscribe = "";
  let buttonUsed = false;
  const btn = (label: string, url: string) => {
    // Первая ссылка — главная кнопка, следующие — обычные ссылки под ней
    if (!buttonUsed) { buttonUsed = true; blocks.push({ t: "btn", label, url }); }
    else blocks.push({ t: "p", text: `${label}: ${url}` });
  };
  const code = vars.code != null ? String(vars.code) : "";
  for (const para of body.replace(/\r/g, "").split(/\n{2,}/).map(p => p.trim()).filter(Boolean)) {
    const lines = para.split("\n").map(l => l.trim()).filter(Boolean);
    // «Название\nссылка» — карточка объявления; «Текст:\nссылка» — текст и кнопка
    if (lines.length === 2 && ONLY_URL.test(lines[1]) && !ONLY_URL.test(lines[0])) {
      if (lines[0].endsWith(":")) { blocks.push({ t: "p", text: lines[0] }); btn(BUTTONS[key] ?? "Открыть на сайте", lines[1]); }
      else blocks.push({ t: "card", title: lines[0], url: lines[1] });
      continue;
    }
    if (lines.length === 1 && ONLY_URL.test(lines[0])) { btn(BUTTONS[key] ?? "Открыть на сайте", lines[0]); continue; }
    // Последняя строка «Подпись: ссылка» → кнопка, остальное — обычным разбором
    const last = lines[lines.length - 1];
    const lm = last.match(/^(.*?)[:：]\s*(https?:\/\/\S+)$/);
    if (lm) {
      const label = lm[1].trim();
      if (/^отписаться/i.test(label)) { unsubscribe = lm[2]; lines.pop(); }
      else {
        lines.pop();
        const short = label && label.length <= 26 && !/[.!?]/.test(label);
        const rest = short ? lines : [...lines, label.replace(/[.,;]?$/, ".")];
        if (rest.length) pushText(rest);
        btn(short ? label : BUTTONS[key] ?? "Открыть на сайте", lm[2]);
        continue;
      }
      if (!lines.length) continue;
    }
    pushText(lines);
  }

  function pushText(lines: string[]) {
    const text = lines.join("\n");
    if (code && text.includes(code)) {
      const before = text.replace(code, "").replace(/[\s:]+$/, "");
      blocks.push({ t: "p", text: before ? before + ":" : "" }, { t: "code", code });
      return;
    }
    const first = kv(lines[0]);
    // «Комментарий: …» с переносами строк — одна плашка
    if (first && QUOTES.includes(first.k.toLowerCase()) && lines.slice(1).every(l => !kv(l))) {
      const v = [first.v, ...lines.slice(1)].join("\n").trim();
      if (v && v !== "—") blocks.push({ t: "quote", k: first.k, v });
      return;
    }
    const pairs = lines.map(kv);
    // Все строки вида «Подпись: значение» → таблица (плашки «Комментарий» — отдельно)
    if (lines.length > 1 && pairs.every(Boolean) && !lines.some(l => /https?:\/\//.test(l))) {
      let rows: { k: string; v: string }[] = [];
      for (const p of pairs as { k: string; v: string }[]) {
        if (QUOTES.includes(p.k.toLowerCase())) {
          if (rows.length) { blocks.push({ t: "rows", rows }); rows = []; }
          if (p.v && p.v !== "—") blocks.push({ t: "quote", k: p.k, v: p.v });
        } else if (p.v) rows.push(p);
      }
      if (rows.length) blocks.push({ t: "rows", rows });
      return;
    }
    blocks.push({ t: "p", text });
  }
  return { blocks, unsubscribe };
}

function renderBlock(b: Block): string {
  switch (b.t) {
    case "p": return b.text ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${C.ink}">${linkify(b.text).replace(/\n/g, "<br>")}</p>` : "";
    case "btn": return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 22px"><tr><td bgcolor="${C.accent}" style="border-radius:8px">
<a href="${esc(b.url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">${esc(b.label)}</a></td></tr></table>`;
    case "rows": return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border:1px solid ${C.line};border-radius:8px;border-collapse:separate">
${b.rows.map((r, i) => `<tr><td style="padding:12px 16px;${i ? `border-top:1px solid ${C.line};` : ""}font-size:14px;color:${C.ink2};width:38%;vertical-align:top">${esc(r.k)}</td><td style="padding:12px 16px;${i ? `border-top:1px solid ${C.line};` : ""}font-size:15px;font-weight:700;color:${C.ink};vertical-align:top">${linkify(r.v)}</td></tr>`).join("\n")}
</table>`;
    case "quote": return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px"><tr><td style="background:${C.gray};border-left:3px solid ${C.accent};border-radius:0 8px 8px 0;padding:14px 18px">
<div style="font-size:13px;color:${C.ink2};margin:0 0 4px">${esc(b.k)}</div><div style="font-size:15px;line-height:1.5;color:${C.ink}">${linkify(b.v).replace(/\n/g, "<br>")}</div></td></tr></table>`;
    case "card": {
      // «Название, Курорт, от 3 000 ₽» — разбираем с конца: в названии тоже бывают запятые
      const parts = b.title.split(/,\s+/);
      const price = parts.length > 1 && /^от\s/.test(parts[parts.length - 1]) ? parts.pop() : "";
      const sub = parts.length > 1 ? parts.pop() : "";
      const name = parts.join(", ");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;border:1px solid ${C.line};border-radius:8px;border-collapse:separate"><tr>
<td style="padding:14px 16px"><a href="${esc(b.url)}" target="_blank" style="font-size:16px;font-weight:700;color:${C.ink};text-decoration:none">${esc(name)}</a>${sub ? `<div style="font-size:14px;color:${C.ink2};margin-top:3px">${esc(sub)}</div>` : ""}</td>
<td align="right" style="padding:14px 16px;white-space:nowrap;vertical-align:middle">${price ? `<div style="font-size:15px;font-weight:700;color:${C.ink}">${esc(price)}</div>` : ""}<a href="${esc(b.url)}" target="_blank" style="font-size:14px;color:${C.accent};text-decoration:none">Смотреть →</a></td></tr></table>`;
    }
    case "code": return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px"><tr><td style="background:${C.soft};border-radius:8px;padding:16px 26px;font-family:'Roboto Mono',Consolas,'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:8px;color:${C.ink}">${esc(b.code)}</td></tr></table>`;
  }
}

export type MailLook = { siteName: string; baseUrl: string; tagline?: string };

/** HTML-версия письма. subject — заголовок, body — текст из шаблона. */
export function mailHtml(look: MailLook, subject: string, body: string, key = "", vars: Record<string, string | number> = {}) {
  // Подпись рассылки («—\nВы получили письмо…») уходит в подвал
  const [main, footNote] = body.split(/\n+—\n/);
  const { blocks, unsubscribe } = parse(key, main, vars);
  const base = look.baseUrl.replace(/\/$/, "");
  const host = base.replace(/^https?:\/\//, "");
  const preheader = (blocks.find(b => b.t === "p") as { text: string } | undefined)?.text.replace(/https?:\/\/\S+/g, "").slice(0, 120) ?? "";
  const logo = base ? `<img src="${base}/icon-192.png" width="36" height="36" alt="" style="display:block;border:0;border-radius:8px">` : "";
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<style>@media (max-width:620px){.nb-card{padding:26px 20px!important}.nb-h1{font-size:22px!important}}a{color:${C.accent}}</style></head>
<body style="margin:0;padding:0;background:${C.gray};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.gray}" style="background:${C.gray}"><tr><td align="center" style="padding:28px 12px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;font-family:${FONT}">
<tr><td style="padding:0 4px 18px"><a href="${base || "#"}" target="_blank" style="text-decoration:none"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
${logo ? `<td style="padding-right:10px">${logo}</td>` : ""}<td style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.ink};letter-spacing:-.3px">${esc(look.siteName.toLowerCase())}</td></tr></table></a></td></tr>
<tr><td class="nb-card" bgcolor="#ffffff" style="background:#ffffff;border-radius:12px;padding:36px 40px 22px">
<h1 class="nb-h1" style="margin:0 0 20px;font-size:25px;line-height:1.25;font-weight:700;color:${C.ink}">${esc(subject)}</h1>
${blocks.map(renderBlock).join("\n")}
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:13px;line-height:1.6;color:${C.ink2}">
${look.tagline ? `${esc(look.tagline)}<br>` : ""}${base ? `<a href="${base}" target="_blank" style="color:${C.ink2};text-decoration:underline">${esc(host)}</a>` : ""}
${footNote ? `<br>${linkify(footNote.trim())}` : ""}
${unsubscribe ? `<br><a href="${esc(unsubscribe)}" target="_blank" style="color:${C.ink2};text-decoration:underline">Отписаться от этих писем</a>` : ""}
<br>Письмо отправлено автоматически, отвечать на него не нужно.
</td></tr></table></td></tr></table></body></html>`;
}
