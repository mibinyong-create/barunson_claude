import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // basePath 는 Docker Manager 가 배포 승인 시 자동으로 주입하므로 여기에 직접 쓰지 않는다.
  // (직접 추가하면 자동 주입과 키가 중복되어 빌드가 깨질 수 있다.)

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
