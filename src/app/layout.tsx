import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { getSettings } from "@/lib/settings";
import "./globals.css";
import { Toaster } from "@/components/Toaster";
import { Pwa } from "@/components/Pwa";

export const viewport: Viewport = { themeColor: "#E8620C", colorScheme: "light" };

const manrope = Manrope({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"], variable: "--font" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: s.seoTitle, template: `%s — ${s.siteName}` },
    description: s.seoDescription,
    metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
    appleWebApp: { capable: true, title: s.siteName, statusBarStyle: "default" },
    verification: { yandex: s.yandexVerification || undefined, google: s.googleVerification || undefined },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body style={{ fontFamily: "var(--font), var(--f)" }}>{children}<Toaster /><Pwa /></body>
    </html>
  );
}
