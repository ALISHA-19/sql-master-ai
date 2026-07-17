import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next doesn't get confused by
  // sibling lockfiles higher up the directory tree.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
