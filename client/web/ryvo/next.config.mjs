/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Required for Bun Docker image (standalone server bundle). */
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
  async redirects() {
    return [
      {
        source: "/driver/advanced/settings",
        destination: "/driver/settings/configurations",
        permanent: false,
      },
      {
        source: "/client/advanced/settings",
        destination: "/client/settings/configurations",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
