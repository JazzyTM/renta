import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Order } from "@/generated/prisma/client";
import { getSettings } from "./settings";
import type { PaymentProvider } from "./payments";

// Pally (pally.info). API: https://pally.info/reference/api
// Счёт: POST /api/v1/bill/create → ссылка на оплату. После оплаты Pally шлёт postback на Result URL магазина
// (у нас /api/pay/pally) с подписью md5(OutSum:InvId:apiToken) в верхнем регистре.
const API = "https://pal24.pro/api/v1";

async function creds() {
  const s = await getSettings();
  const token = String(s.paymentSecret || process.env.PALLY_TOKEN || "");
  const shopId = String(s.paymentShopId || process.env.PALLY_SHOP_ID || "");
  if (!token || !shopId) throw new Error("Pally: не заданы ID магазина и API-токен в настройках оплаты");
  return { token, shopId, siteName: String(s.siteName) };
}

const md5 = (s: string) => createHash("md5").update(s).digest("hex").toUpperCase();

export const pally: PaymentProvider = {
  title: "Pally",
  async createPayment(order: Order, returnUrl: string) {
    const { token, shopId, siteName } = await creds();
    const base = (process.env.APP_URL || "").replace(/\/$/, "");
    const what = order.kind === "tariff" ? "тариф" : "продвижение объявления";
    const body = new URLSearchParams({
      amount: order.amount.toFixed(2), shop_id: shopId, order_id: String(order.number), type: "normal", currency_in: "RUB", locale: "ru",
      name: `${siteName}: ${what}`, description: `Заказ №${order.number} на ${siteName}: ${what}`, custom: order.id,
      // Домены success/fail/return должны совпадать с адресом магазина в Pally
      success_url: `${base}/api/pay/pally/return?r=ok&o=${order.number}`, fail_url: `${base}/api/pay/pally/return?r=fail&o=${order.number}`, return_url: returnUrl,
    });
    const res = await fetch(`${API}/bill/create`, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, body, signal: AbortSignal.timeout(15000) });
    const j = await res.json().catch(() => null) as { success?: boolean | string; link_page_url?: string; bill_id?: string; message?: string } | null;
    if (!res.ok || !j?.link_page_url || !j.bill_id) throw new Error(`Pally: не удалось создать счёт (${res.status}${j?.message ? `: ${j.message}` : ""})`);
    return { redirectUrl: j.link_page_url, externalId: j.bill_id };
  },
  async webhook(req: Request) {
    const { token } = await creds();
    const f = Object.fromEntries((await req.formData()).entries()) as Record<string, string>;
    const sig = String(f.SignatureValue || "").toUpperCase();
    const want = md5(`${f.OutSum}:${f.InvId}:${token}`);
    if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
    const orderNumber = Number(f.InvId);
    if (!Number.isInteger(orderNumber)) return null;
    // UNDERPAID — заплачено меньше счёта: не включаем, разбирается администратор
    return { orderNumber, paid: f.Status === "SUCCESS" || f.Status === "OVERPAID", raw: { ...f, SignatureValue: undefined } };
  },
};
