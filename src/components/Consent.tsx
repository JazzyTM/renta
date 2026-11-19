import Link from "next/link";

// Согласие на обработку персональных данных (152-ФЗ): отдельная отметка в формах, где человек оставляет свои данные
export function Consent({ id = "pd" }: { id?: string }) {
  return (
    <label className="check consent" htmlFor={id}>
      <input type="checkbox" id={id} name="pd" required />
      <span>Даю <Link href="/p/consent" target="_blank">согласие на обработку персональных данных</Link> и принимаю <Link href="/p/privacy" target="_blank">политику</Link> и <Link href="/p/offer" target="_blank">соглашение</Link></span>
    </label>
  );
}

export const NO_CONSENT = "Отметьте согласие на обработку персональных данных";
export const hasConsent = (fd: FormData) => fd.get("pd") === "on";
