/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendTarget =
      process.env.BACKEND_URL ||
      process.env.BACKEND_INTERNAL_URL ||
      "http://127.0.0.1:8000";

    return [
      {
        source: "/api/:path*",
        destination: `${backendTarget.replace(/\/+$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
