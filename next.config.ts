import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is almost entirely live data (stock, orders), so pages render per request.
  cacheComponents: false,
  images: {
    // Food photos are served resized and as AVIF/WebP, cached for a month.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 31,
    deviceSizes: [640, 828, 1080, 1280],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-**" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
