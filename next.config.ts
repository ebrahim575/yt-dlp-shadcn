import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['i.ytimg.com'], // Allow YouTube thumbnail domain
  },
  /* other config options can go here */
};

export default nextConfig;
