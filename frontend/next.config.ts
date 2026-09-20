import type { NextConfig } from "next";
import path from "path";

// Force Turbopack root to this frontend app.
// Stray D:\package.json + D:\package-lock.json otherwise make Next
// treat D:\ as the workspace and break resolving tailwindcss.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
