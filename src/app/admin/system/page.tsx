import os from "os";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { listBackups, currentVersion, STATE_DIR, BACKUP_DIR } from "@/lib/updates";
import { UPLOAD_DIR } from "@/lib/upload";
import { fmtDateTime } from "@/lib/format";
import { RunButton } from "@/components/admin/RunButton";
import { startUpdate } from "../updates/actions";
import { execFile } from "child_process";
import { promisify } from "util";

export const metadata = { title: "Сервер" };
export const dynamic = "force-dynamic";
const mb = (n: number) => (n / 1048576).toFixed(n > 1e9 ? 0 : 1) + " МБ";

export default async function System() {
  await requireAdmin();
  const [dbSize, backups, ver, counts, du] = await Promise.all([
    db.$queryRaw<{ s: bigint }[]>`SELECT pg_database_size(current_database()) AS s`.then(r => Number(r[0].s)).catch(() => 0),
    listBackups(), currentVersion(),
    Promise.all([db.listing.count(), db.listingPhoto.count(), db.user.count(), db.booking.count()]),
    promisify(execFile)("du", ["-sb", UPLOAD_DIR]).then(r => Number(r.stdout.split("\t")[0])).catch(() => 0),
  ]);
  const disk = await promisify(execFile)("df", ["-B1", "--output=size,avail", "/"]).then(r => r.stdout.trim().split("\n")[1].trim().split(/\s+/).map(Number)).catch(() => null);
  return (
    <>
      <h1 className="h1">Сервер и резервные копии</h1>
      <div className="stats">
        <div className="stat"><b>{mb(dbSize)}</b><span>база данных</span></div>
        <div className="stat"><b>{mb(du)}</b><span>фото ({counts[1]} шт.)</span></div>
        {disk && <div className="stat"><b>{mb(disk[1])}</b><span>свободно на диске из {mb(disk[0])}</span></div>}
        <div className="stat"><b>{mb(os.totalmem() - os.freemem())}</b><span>памяти занято из {mb(os.totalmem())}</span></div>
        <div className="stat"><b>{os.loadavg()[0].toFixed(2)}</b><span>нагрузка, ядер {os.cpus().length}</span></div>
        <div className="stat"><b>{Math.round(process.uptime() / 3600)} ч</b><span>сайт работает без перезапуска</span></div>
      </div>
      <div className="card-box"><dl className="kv">
        <dt>Версия кода</dt><dd>{ver ? `${ver.sha.slice(0, 7)} · ${ver.msg}` : "—"}</dd>
        <dt>Node.js</dt><dd>{process.version}</dd>
        <dt>Система</dt><dd>{os.type()} {os.release()}, {os.hostname()}</dd>
        <dt>Адрес сайта</dt><dd>{process.env.APP_URL || "не задан (APP_URL в .env)"}</dd>
        <dt>Папки</dt><dd className="small">фото {UPLOAD_DIR}, служебные {STATE_DIR}, копии {BACKUP_DIR}</dd>
        <dt>Записей</dt><dd>объявлений {counts[0]}, пользователей {counts[2]}, заявок {counts[3]}</dd>
      </dl></div>
      <div className="card-box stack">
        <div className="row between"><b>Резервные копии</b><RunButton action={startUpdate.bind(null, "backup")}>Сделать копию сейчас</RunButton></div>
        <p className="small muted">Копия базы и фото делается каждую ночь, хранятся последние 14. Восстановить по SSH: <code>sudo /opt/renta/deploy/restore.sh имя-файла</code></p>
        {backups.length ? <div className="lines">{backups.map(b => <div className="l" key={b.name}><span className="small">{b.name}</span><span className="small muted">{mb(b.size)} · {fmtDateTime(b.at)}</span></div>)}</div> : <p className="muted small">Копий пока нет.</p>}
      </div>
    </>
  );
}
