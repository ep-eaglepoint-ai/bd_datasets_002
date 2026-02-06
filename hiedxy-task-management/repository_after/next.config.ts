import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ["idb"],
};

export default nextConfig;
