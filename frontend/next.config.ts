import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*", // using 127.0.0.1 to avoid ipv6 node fetch issues
      },
    ];
  },
};

export default nextConfig;
