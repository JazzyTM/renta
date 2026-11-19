import "server-only";
import { getSettings } from "./settings";
import { fmtDate } from "./format";

const MISSING = "[не указано — заполните в админке: Настройки → Реквизиты]";

/** Реквизиты для юридических текстов. missing — каких полей не хватает (для подсказки в админке) */
export async function legalInfo() {
  const s = await getSettings();
  const domain = String(s.legalDomain || "").replace(/^https?:\/\//, "").replace(/\/$/, "") || (process.env.APP_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const email = String(s.legalEmail || s.contactEmail || "");
  const fields: [string, string, string][] = [
    ["operator", String(s.legalName || ""), "оператор"],
    ["inn", String(s.legalInn || ""), "ИНН"],
    ["ogrn", String(s.legalOgrn || ""), "ОГРН"],
    ["address", String(s.legalAddress || ""), "адрес"],
    ["email", email, "почта"],
  ];
  return { site: String(s.siteName), domain, fields, missing: fields.filter(f => !f[1]).map(f => f[2]) };
}

/** Подставить {{site}}, {{domain}}, {{operator}}, {{inn}}, {{ogrn}}, {{address}}, {{email}}, {{date}} */
export async function fillLegal(text: string, updatedAt?: Date) {
  if (!text.includes("{{")) return text;
  const { site, domain, fields } = await legalInfo();
  const map: Record<string, string> = { site: `«${site}»`, domain, date: fmtDate(updatedAt ?? new Date()) };
  for (const [k, v] of fields) map[k] = v || MISSING;
  return text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => map[k] ?? m);
}
