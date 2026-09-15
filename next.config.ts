import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Database drivers use Node.js APIs (sockets, WASM, fs) and must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Drizzle migrations are read from disk at runtime (auto-migrate), so trace them into
  // every server function when deploying to Vercel.
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
  poweredByHeader: false,
};

export default nextConfig;
