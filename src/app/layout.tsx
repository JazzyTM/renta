import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"], variable: "--font" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: s.seoTitle, template: `%s — ${s.siteName}` },
    description: s.seoDescription,
    metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
    verification: { yandex: s.yandexVerification || undefined, google: s.googleVerification || undefined },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body style={{ fontFamily: "var(--font), var(--f)" }}>{children}</body>
    </html>
  );
}
