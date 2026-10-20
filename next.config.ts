import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone" is used for Docker builds only
  // Vercel handles its own build output automatically
  ...(process.env.DOCKER_BUILD === "true" ? { output: "standalone" as const } : {}),
  // `next dev` would otherwise print every Server Function call with its
  // arguments, which include values typed into forms such as settings.
  logging: { serverFunctions: false },
  // Keep `next dev` from writing an AGENTS.md into the repo when it runs
  // under a coding agent.
  agentRules: false,
  experimental: {
    // Agent-run builds would otherwise query the advisory API and can fail
    // once on a new advisory. Dependency advisories are tracked with npm audit.
    agentUpgrade: false,
  },
  // public/ files are served with max-age=0, so the theme fonts under /fonts
  // would be revalidated on every load. Their names don't change when a font
  // is refetched, so they get a day's cache and a week of stale reuse, not
  // immutable.
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
