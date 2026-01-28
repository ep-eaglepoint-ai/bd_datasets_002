import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Specify the source directory
  experimental: {
    appDir: true,
  },
  // Configure paths for the new structure
  distDir: '.next',
  // Add any other config options here
};

export default nextConfig;
