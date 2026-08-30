import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "src/server.ts" },
      serverFns: {
        disableCsrfMiddlewareWarning: true,
      },
      importProtection: {
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    react(),
  ],
  optimizeDeps: {
    include: [
      "@clerk/shared/error",
      "@clerk/react",
      "@clerk/react/internal",
      "@clerk/shared/getToken",
      "@clerk/shared/getEnvVariable",
      "@clerk/shared/underscore",
      "@tanstack/router-core",
      "@tanstack/router-core/isServer",
      "@tanstack/router-core/ssr/client",
      "seroval",
    ],
    exclude: [
      "pg",
      "pg-native",
      "@tanstack/start-server-core",
      "@tanstack/react-start",
      "@tanstack/react-router",
    ],
  },
  ssr: {
    external: [
      "pg",
      "pg-native",
      "bcryptjs",
      "stripe",
    ],
    noExternal: [],
  },
  resolve: {
    alias: {
      "@": `${process.cwd()}/src`,
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT ?? "5000"),
    allowedHosts: true,
    proxy: {
      // Replit mockup-sandbox proxy (no-op when running outside Replit)
      "/__mockup": {
        target: "http://localhost:23636",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
