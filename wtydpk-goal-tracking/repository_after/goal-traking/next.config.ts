import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: 'standalone',
  
  // Optimize images
  images: {
    domains: [],
  },
  
  // TypeScript configuration
  typescript: {
    // Enable strict type checking
    tsconfigPath: './tsconfig.json',
  },
  
  // Experimental features
  experimental: {
    // Enable page router optimization
    optimizePackageImports: ['date-fns', 'recharts', 'zustand'],
  },
};

export default nextConfig;
