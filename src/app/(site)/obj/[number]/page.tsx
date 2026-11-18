import { notFound, permanentRedirect } from "next/navigation";
import { listingRoute } from "./view";

// Старый адрес /obj/123 — постоянное перенаправление на ЧПУ
export default async function OldListingUrl({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<Record<string, string>> }) {
  const n = Number((await params).number);
  const path = Number.isInteger(n) ? await listingRoute(n) : null;
  if (!path) notFound();
  const q = new URLSearchParams(await searchParams).toString();
  permanentRedirect(q ? `${path}?${q}` : path);
}
