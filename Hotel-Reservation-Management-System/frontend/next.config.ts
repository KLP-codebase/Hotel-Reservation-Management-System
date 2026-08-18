import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloudflare Pages deployment
  output: "export",

  images: {
    // Use unoptimized images for static export (Cloudflare Images can handle CDN)
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cloudflare.com",
      },
    ],
  },

  // Environment variable exposure
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // TypeScript & ESLint settings
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
