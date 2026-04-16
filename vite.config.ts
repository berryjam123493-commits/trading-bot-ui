import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Yahoo Finance 는 브라우저에서 직접 fetch 하면 CORS 로 막히므로
 * dev server 가 프록시 역할을 한다. 프로덕션 배포 시에는 자체 백엔드로 대체.
 */
export default defineConfig({
  // GitHub Pages: 저장소 서브디렉터리에서 서빙되므로 base 경로 필요.
  // 로컬 dev 서버에서는 무시됨.
  base: process.env.GITHUB_PAGES ? "/trading-bot-ui/" : "/",
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    host: "localhost",
    proxy: {
      "/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yahoo/, ""),
        headers: {
          // 일부 배포는 User-Agent 없으면 401을 반환
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    },
  },
});
