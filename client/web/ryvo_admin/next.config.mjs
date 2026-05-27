/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  /**
   * Production-grade dashboard needs server rendering + dynamic routes.
   * Keep default output (no static export).
   */
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
