import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The MongoDB driver (and the in-memory server used by tests) use Node.js APIs and must not be bundled.
  serverExternalPackages: ["mongodb", "mongodb-memory-server"],
  poweredByHeader: false,
};

export default nextConfig;
