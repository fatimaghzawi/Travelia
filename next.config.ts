import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security/headers";

const isProd = process.env.NODE_ENV === "production";

const imageHosts = (
  process.env.NEXT_IMAGE_HOSTS ||
  "images.unsplash.com,lh3.googleusercontent.com,avatars.githubusercontent.com,res.cloudinary.com,*.public.blob.vercel-storage.com"
)
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // Standalone is for Docker/self-host. Vercel uses its own output pipeline.
  ...(isProd && !process.env.VERCEL ? { output: "standalone" as const } : {}),
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      ...imageHosts.map((hostname) => ({
        protocol: "https" as const,
        hostname,
      })),
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
  async headers() {
    const headers = [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];

    // Long-lived static caching is prod-only — applying it in `next dev`
    // breaks Turbopack HMR and causes stale chunk / module factory errors.
    if (isProd) {
      headers.push({
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      });
    }

    return headers;
  },
};

export default nextConfig;
