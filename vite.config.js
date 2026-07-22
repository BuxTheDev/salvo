import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Salvo.jsx prototype lives at the repo root and is mounted by src/main.jsx.
// esbuild is told to treat .js files as JSX is unnecessary here since the
// component uses the .jsx extension, which Vite handles out of the box.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Allow access through Cursor Cloud's per-pod preview URLs (….cursorvm.com)
    // in addition to localhost. A leading dot allows all subdomains.
    allowedHosts: [".cursorvm.com"],
  },
});
