import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the app to be deployed on Render with a standard Node.js server
  output: "standalone",
  // Expose env vars to the browser at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000",
  },
};

export default nextConfig;
