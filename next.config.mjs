/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer is a heavy Node library; keep it external so it loads
  // from node_modules at runtime instead of being bundled into the server chunk.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
