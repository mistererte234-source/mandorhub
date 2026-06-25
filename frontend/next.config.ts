import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Di Vercel, kita akan arahkan ini ke URL Backend Render via Environment Variable
    const apiUrl = process.env.API_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`, 
      },
    ];
  },
};

export default nextConfig;
