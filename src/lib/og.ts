import type { Metadata } from "next";

/** Превью ссылки для соцсетей и мессенджеров: заголовок, описание, адрес и фирменная картинка /og/… */
export function ogMeta({ title, description, path, image, siteName, type = "website" }: { title: string; description?: string | null; path: string; image: string; siteName: string; type?: "website" | "article" }): Pick<Metadata, "openGraph" | "twitter"> {
  const desc = description ? (description.length > 200 ? description.slice(0, 197) + "…" : description) : undefined;
  const img = { url: image, width: 1200, height: 630, alt: title, type: "image/jpeg" };
  return {
    openGraph: { type, siteName, locale: "ru_RU", url: path, title, description: desc, images: [img] },
    twitter: { card: "summary_large_image", title, description: desc, images: [image] },
  };
}
