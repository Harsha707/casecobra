/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["utfs.io"],
  },
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // Allow all origins
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          }, // Allow all methods
          { key: "Access-Control-Allow-Headers", value: "*" }, // Allow all headers
        ],
      },
    ];
  },
};

export default nextConfig;
