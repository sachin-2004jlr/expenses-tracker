import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The MongoDB driver (and the in-memory server used by tests) use Node.js APIs and must not be bundled.
  serverExternalPackages: ["mongodb", "mongodb-memory-server"],
  poweredByHeader: false,
  experimental: {
    // Keep visited pages in the client router cache so switching tabs is instant. Server actions
    // call revalidatePath, which clears this cache, so data never goes stale after a change.
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
