// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. กำหนด Base Path ตามที่คุณต้องการ
  basePath: '/test2',
  
  // 2. ใช้ Standalone เพื่อให้ง่ายต่อการ Deploy บน Docker/Server
  output: 'standalone',
  
  // (Optional) ป้องกันปัญหากรณี Link ไปผิด Path
  trailingSlash: true, 
};

export default nextConfig;