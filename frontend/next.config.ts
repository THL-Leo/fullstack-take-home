import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Disable image optimization in development to avoid localhost issues
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
