import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { EMAIL_DEFAULTS } from "@/lib/mail";
import { TPL_NAMES } from "@/lib/labels";

export const metadata = { title: "Шаблоны писем" };

export default async function Emails() {
  await requireAdmin();
  const custom = new Set((await db.emailTemplate.findMany({ select: { key: true } })).map(t => t.key));
  return (
    <>
      <h1 className="h1">Шаблоны писем</h1>
      <div className="tablewrap"><table className="t"><thead><tr><th>Письмо</th><th>Тема</th><th></th></tr></thead><tbody>
        {Object.entries(EMAIL_DEFAULTS).map(([k, v]) => <tr key={k}><td><Link href={`/admin/emails/${k}`}>{TPL_NAMES[k] ?? k}</Link></td><td className="small">{v.subject}</td><td>{custom.has(k) ? <span className="tag accent">изменён</span> : ""}</td></tr>)}
      </tbody></table></div>
    </>
  );
}
