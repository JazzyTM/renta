import "server-only";
import { createHash, randomBytes } from "crypto";
import { getSettings } from "./settings";

export type Profile = { id: string; email?: string; name: string; avatar?: string };

const b64 = (b: Buffer) => b.toString("base64url");
export const newVerifier = () => b64(randomBytes(32));
const challenge = (v: string) => b64(createHash("sha256").update(v).digest());
const redirectUri = (p: string) => `${process.env.APP_URL}/auth/${p}/callback`;

async function creds(p: "vk" | "yandex") {
  const s = await getSettings();
  if (p === "vk") return { enabled: !!s.vkEnabled, id: s.vkClientId || process.env.VK_CLIENT_ID || "", secret: s.vkClientSecret || process.env.VK_CLIENT_SECRET || "" };
  return { enabled: !!s.yandexEnabled, id: s.yandexClientId || process.env.YANDEX_CLIENT_ID || "", secret: s.yandexClientSecret || process.env.YANDEX_CLIENT_SECRET || "" };
}

export async function authorizeUrl(p: "vk" | "yandex", state: string, verifier: string) {
  const c = await creds(p);
  if (!c.enabled || !c.id) return null;
  if (p === "vk")
    return `https://id.vk.com/authorize?${new URLSearchParams({ response_type: "code", client_id: c.id, redirect_uri: redirectUri(p), state, scope: "email", code_challenge: challenge(verifier), code_challenge_method: "S256" })}`;
  return `https://oauth.yandex.ru/authorize?${new URLSearchParams({ response_type: "code", client_id: c.id, redirect_uri: redirectUri(p), state })}`;
}

export async function fetchProfile(p: "vk" | "yandex", params: URLSearchParams, verifier: string): Promise<Profile> {
  const c = await creds(p);
  const code = params.get("code") ?? "";
  if (p === "vk") {
    const tok = await fetch("https://id.vk.com/oauth2/auth", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({
      grant_type: "authorization_code", code, code_verifier: verifier, client_id: c.id, device_id: params.get("device_id") ?? "", redirect_uri: redirectUri(p), state: params.get("state") ?? "",
    }) }).then(r => r.json());
    if (!tok.access_token) throw new Error("vk token: " + JSON.stringify(tok));
    const info = await fetch("https://id.vk.com/oauth2/user_info", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: c.id, access_token: tok.access_token }) }).then(r => r.json());
    const u = info.user ?? {};
    return { id: String(u.user_id ?? tok.user_id), email: u.email || tok.email, name: [u.first_name, u.last_name].filter(Boolean).join(" "), avatar: u.avatar };
  }
  const tok = await fetch("https://oauth.yandex.ru/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: c.id, client_secret: c.secret }) }).then(r => r.json());
  if (!tok.access_token) throw new Error("yandex token: " + JSON.stringify(tok));
  const u = await fetch("https://login.yandex.ru/info?format=json", { headers: { Authorization: `OAuth ${tok.access_token}` } }).then(r => r.json());
  return { id: String(u.id), email: u.default_email, name: u.real_name || u.display_name || "", avatar: u.default_avatar_id ? `https://avatars.yandex.net/get-yapic/${u.default_avatar_id}/islands-200` : undefined };
}
