import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['i.ytimg.com'], // Allow YouTube thumbnail domain
  },
  env: {
    // Define the path to the yt-dlp binary for the runtime environment
    // This might help ensure it's recognized during build/deployment
    YTDLP_BIN: '/var/task/bin/yt-dlp',
  },
  /* other config options can go here */
};

export default nextConfig;