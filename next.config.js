/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  // Configuratie voor mammoth.js (server-side only)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
