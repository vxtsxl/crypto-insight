import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // This is required for Docker
  /* config options here */
};

export default nextConfig;
