import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for optimized Docker production builds
  // This creates a self-contained build with only necessary dependencies
  output: "standalone",
};

export default nextConfig;
