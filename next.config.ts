import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
};

export default nextConfig;
