// Возврат покупателя после оплаты. Pally присылает его POST-запросом, поэтому это обработчик, а не страница.
import { localRedirect } from "@/lib/redirect";

function back(req: Request) {
  const u = new URL(req.url);
  const r = u.searchParams.get("r") === "ok" ? "ok" : "fail";
  const o = Number(u.searchParams.get("o")) || "";
  return localRedirect(`/cabinet/tariff?pay=${r}&order=${o}`, 303);
}
export const GET = back;
export const POST = back;
