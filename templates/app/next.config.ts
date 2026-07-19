import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root. Next infers it from the nearest lockfile, which
    // picks the WRONG directory whenever this app sits inside another npm
    // project — a monorepo package, or this template inside the CLI repo.
    root: __dirname,
  },
  /* config options here */
};

export default nextConfig;
