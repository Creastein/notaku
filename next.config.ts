import type { NextConfig } from "next";
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // optional: runtime caching strategies can be added here
});

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

module.exports = withPWA(nextConfig);
