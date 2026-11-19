import Link from "next/link";

// Согласие на обработку персональных данных (152-ФЗ): отдельная отметка в формах, где человек оставляет свои данные
// optional: для входа по коду — обязательна только новым (проверяет сервер)
export function Consent({ id = "pd", optional = false }: { id?: string; optional?: boolean }) {
  return (
    <label className="check consent" htmlFor={id}>
      <input type="checkbox" id={id} name="pd" required={!optional} />
      <span>{optional ? "Если вы у нас впервые: даю " : "Даю "}<Link href="/p/consent" target="_blank">согласие на обработку персональных данных</Link> и принимаю <Link href="/p/privacy" target="_blank">политику</Link> и <Link href="/p/offer" target="_blank">соглашение</Link></span>
    </label>
  );
}

export const NO_CONSENT = "Отметьте согласие на обработку персональных данных";
export const hasConsent = (fd: FormData) => fd.get("pd") === "on";
