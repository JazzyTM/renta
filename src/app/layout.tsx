import type { Metadata, Viewport } from "next";
import { getSettings } from "@/lib/settings";
import { ogMeta } from "@/lib/og";
import "./globals.css";
import { Toaster } from "@/components/Toaster";
import { Pwa } from "@/components/Pwa";
import { TableLabels } from "@/components/TableLabels";

export const viewport: Viewport = { themeColor: "#F2543D", colorScheme: "light" };

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: s.seoTitle, template: `%s — ${s.siteName}` },
    description: s.seoDescription,
    metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
    appleWebApp: { capable: true, title: s.siteName, statusBarStyle: "default" },
    verification: { yandex: s.yandexVerification || undefined, google: s.googleVerification || undefined },
    ...ogMeta({ title: String(s.seoTitle), description: String(s.seoDescription || ""), path: "/", image: "/og/home", siteName: String(s.siteName) }),
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}<Toaster /><Pwa /><TableLabels /></body>
    </html>
  );
}
