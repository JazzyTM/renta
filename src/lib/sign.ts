import { createHmac } from "crypto";
export const sign = (v: string | number) => createHmac("sha256", process.env.AUTH_SECRET || "dev").update(String(v)).digest("base64url").slice(0, 22);
export const checkSign = (v: string | number, k?: string | null) => !!k && sign(v) === k;
