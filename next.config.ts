import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer ships browser/node builds; keep it out of RSC bundling.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
