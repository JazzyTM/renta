import "server-only";
import { readFile, writeFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getSettings } from "./settings";

// Обновления движка. На сервере работает systemd-сервис renta-update (deploy/update.sh),
// который следит за файлом-запросом в STATE_DIR. Кнопка в админке только создаёт этот файл.
export const STATE_DIR = process.env.STATE_DIR || "/var/lib/renta";
export const BACKUP_DIR = process.env.BACKUP_DIR || "/var/backups/renta";
const run = promisify(execFile);

export async function currentVersion() {
  try {
    const { stdout } = await run("git", ["log", "-1", "--format=%H|%cI|%s"], { cwd: process.cwd() });
    const [sha, date, msg] = stdout.trim().split("|");
    return { sha, date, msg };
  } catch { return null; }
}

async function gh(path: string) {
  const s = await getSettings();
  const r = await fetch(`https://api.github.com/repos/${s.githubRepo}${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "renta-updater", ...(s.githubToken ? { Authorization: `Bearer ${s.githubToken}` } : {}) },
    cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`GitHub ответил ${r.status}`);
  return r.json();
}

export async function checkUpdates() {
  const s = await getSettings();
  const cur = await currentVersion();
  const latest = await gh(`/commits/${s.githubBranch}`);
  if (!cur || cur.sha === latest.sha) return { cur, latest: { sha: latest.sha, date: latest.commit.committer.date, msg: latest.commit.message }, commits: [] as { sha: string; msg: string; date: string }[] };
  const cmp = await gh(`/compare/${cur.sha}...${latest.sha}`).catch(() => null);
  const commits = (cmp?.commits ?? []).reverse().map((c: any) => ({ sha: c.sha, msg: c.commit.message.split("\n")[0], date: c.commit.committer.date }));
  return { cur, latest: { sha: latest.sha, date: latest.commit.committer.date, msg: latest.commit.message }, commits };
}

const read = (f: string) => readFile(join(STATE_DIR, f), "utf8").catch(() => "");

export async function updateState() {
  const [status, log, pending] = await Promise.all([read("status.json"), read("update.log"), read("update-request")]);
  let st: { state?: string; at?: string; from?: string; to?: string; error?: string } = {};
  try { st = JSON.parse(status); } catch {}
  return { status: st, log: log.split("\n").slice(-200).join("\n"), pending: !!pending, available: await stat(STATE_DIR).then(() => true, () => false) };
}

export async function requestUpdate(by: string, kind: "update" | "rollback" | "backup" = "update") {
  await writeFile(join(STATE_DIR, kind === "backup" ? "backup-request" : "update-request"), JSON.stringify({ kind, by, at: new Date().toISOString() }));
}

export async function listBackups() {
  try {
    const files = (await readdir(BACKUP_DIR)).filter(f => f.endsWith(".sql.gz") || f.endsWith(".tar.gz"));
    const out = await Promise.all(files.map(async f => ({ name: f, ...(await stat(join(BACKUP_DIR, f)).then(s => ({ size: s.size, at: s.mtime }))) })));
    return out.sort((a, b) => +b.at - +a.at);
  } catch { return []; }
}
