import type { NextConfig } from "next";

const https = (process.env.APP_URL ?? "").startsWith("https:");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://id.vk.com https://oauth.yandex.ru; object-src 'none'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
        ...(https ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
      ],
    }];
  },
};

export default nextConfig;
