import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { checkUpdates, currentVersion, updateState } from "@/lib/updates";
import { fmtDateTime } from "@/lib/format";
import { RunButton } from "@/components/admin/RunButton";
import { startUpdate } from "./actions";

export const metadata = { title: "Обновления" };
export const dynamic = "force-dynamic";

const STATE: Record<string, [string, string]> = { running: ["Идёт обновление", "warn"], ok: ["Обновлено", "ok"], failed: ["Ошибка, вернул прошлую версию", "bad"], rolledback: ["Откат выполнен", "accent"] };

export default async function Updates() {
  await requireAdmin();
  const s = await getSettings();
  const [st, info] = await Promise.all([updateState(), checkUpdates().catch((e: Error) => ({ error: e.message }))]);
  const cur = "error" in info ? await currentVersion() : info.cur;
  const short = (x?: string) => x?.slice(0, 7) ?? "—";
  return (
    <>
      <h1 className="h1">Обновления</h1>
      <div className="grid2">
        <div className="card-box stack"><b>Установлена</b>
          <div>{cur ? <>версия <code>{short(cur.sha)}</code> от {fmtDateTime(new Date(cur.date))}</> : "неизвестно (нет git)"}</div>
          {cur && <div className="small muted">{cur.msg}</div>}
          {st.status.state && <div className="row"><span className={`tag ${STATE[st.status.state]?.[1]}`}>{STATE[st.status.state]?.[0] ?? st.status.state}</span>{st.status.at && <span className="small muted">{fmtDateTime(new Date(st.status.at))}</span>}</div>}
          {st.status.error && <div className="notice bad">{st.status.error}</div>}
        </div>
        <div className="card-box stack"><b>На GitHub ({s.githubRepo}, ветка {s.githubBranch})</b>
          {"error" in info ? <div className="notice bad">Не удалось проверить: {info.error}</div> : <>
            <div>последняя версия <code>{short(info.latest.sha)}</code> от {fmtDateTime(new Date(info.latest.date))}</div>
            {info.cur?.sha === info.latest.sha ? <span className="tag ok">Установлена последняя версия</span> : <span className="tag accent">Есть обновление{info.commits.length ? `: ${info.commits.length} изменений` : ""}</span>}
          </>}
        </div>
      </div>
      {!("error" in info) && info.commits.length > 0 && <div className="card-box stack"><b>Что нового</b>
        <div className="lines">{info.commits.map((c: { sha: string; msg: string; date: string }) => <div className="l" key={c.sha}><span>{c.msg}</span><span className="small muted">{fmtDateTime(new Date(c.date))}</span></div>)}</div></div>}
      <div className="card-box stack">
        {!st.available && <div className="notice bad">Служба обновлений на этом сервере не найдена. Её ставит скрипт deploy/install.sh.</div>}
        {st.pending && <div className="notice">Запрос принят, обновление скоро начнётся.</div>}
        <div className="row" style={{ alignItems: "start" }}>
          <RunButton action={startUpdate.bind(null, "update")} confirmText="Обновить сайт? Перед обновлением будет сделана копия базы. Сайт перезапустится, это займёт пару минут.">Обновить</RunButton>
          <RunButton action={startUpdate.bind(null, "rollback")} className="btn ghost" confirmText="Вернуть предыдущую версию кода?">Откатить на прошлую версию</RunButton>
        </div>
        <p className="small muted">Как это работает: сервер скачивает новую версию с GitHub, делает копию базы, обновляет базу, собирает сайт и перезапускает его. Если новая версия не запустилась, сервер сам вернёт прошлую. То же самое по SSH: <code>sudo /opt/renta/deploy/update.sh</code>. Автообновление ночью включается в настройках, раздел «Обновления».</p>
      </div>
      {st.log && <div className="stack"><b>Журнал последнего обновления</b><pre className="logbox">{st.log}</pre></div>}
    </>
  );
}
