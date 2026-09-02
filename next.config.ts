import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone is for self-hosted/VPS runs; Vercel builds fail with it (missing .nft.json)
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
