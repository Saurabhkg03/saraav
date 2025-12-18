import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allows external images (e.g., Google user profiles)
      },
    ],
  },
  // Server Actions are now enabled by default in Next.js 15
  experimental: {
    // Add any specific experimental flags here if needed
  },
};

export default nextConfig;