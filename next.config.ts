// // next.config.ts
// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   basePath: '/test2',
//   output: 'standalone',
//   // (Optional) ป้องกันปัญหากรณี Link ไปผิด Path
//   trailingSlash: true, 
// };

// export default nextConfig;

// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // basePath: "/test2",
  output: "standalone",
  trailingSlash: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "http://143.198.88.74:3005/",
        pathname: "/media/**",
      },
      // ถ้า URL รูปมีโดเมนอื่น/ http ให้เพิ่มได้ เช่น
      // { protocol: "http", hostname: "www.tmd.go.th", pathname: "/media/**" },
    ],
  },
};

export default nextConfig;
