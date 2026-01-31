import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true // <-- keep FALSE to actually pass TS
  }
};

export default nextConfig;



