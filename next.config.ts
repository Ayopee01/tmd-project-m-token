// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/test2',
  output: 'standalone',
  // (Optional) ป้องกันปัญหากรณี Link ไปผิด Path
  trailingSlash: true, 
};

export default nextConfig;