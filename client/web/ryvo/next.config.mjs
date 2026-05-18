/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Fully static HTML/CSS/JS — deploy only the `out/` directory. */
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
