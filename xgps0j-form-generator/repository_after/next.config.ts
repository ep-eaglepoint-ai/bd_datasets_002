import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react', 'chart.js'],
  },
  // webpack: (config) => {
  //   // Optimize bundle size
  //   config.resolve.fallback = {
  //     ...config.resolve.fallback,
  //     fs: false,
  //     path: false,
  //   };
    
  //   return config;
  // },
}

export default nextConfig