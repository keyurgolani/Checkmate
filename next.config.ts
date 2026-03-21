import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone" is used for Docker builds only
  // Vercel handles its own build output automatically
  ...(process.env.DOCKER_BUILD === "true" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
