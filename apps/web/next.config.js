/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@dracor/ui", "@dracor/shared", "@dracor/database", "@dracor/game-data"],
};

module.exports = nextConfig;
