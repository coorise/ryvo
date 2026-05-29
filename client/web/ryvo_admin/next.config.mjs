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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
