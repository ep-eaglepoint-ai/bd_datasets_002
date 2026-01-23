import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  // This creates a minimal production bundle
  output: "standalone",
};

export default nextConfig;
