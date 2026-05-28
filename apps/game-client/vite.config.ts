import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
  },
  resolve: {
    dedupe: ['@babylonjs/core'],
  },
  optimizeDeps: {
    // Don't pre-bundle Babylon at all — serve raw ESM directly.
    // This avoids the 1300-file dep explosion.
    exclude: [
      '@babylonjs/core',
      '@babylonjs/gui',
      '@babylonjs/loaders',
      '@babylonjs/materials',
      '@babylonjs/addons',
      '@babylonjs/havok',
    ],
    include: [
      '@dracor/ecs',
      '@dracor/world-gen',
      '@dracor/atmosphere',
    ],
  },
  build: {
    target: 'ES2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 3500,
    // Workspace CJS packages (e.g. @dracor/ecs, used by both the CJS server and ESM client)
    // need explicit inclusion so Rollup can analyze named exports during production build.
    commonjsOptions: {
      include: [/node_modules/, /packages\/(ecs|world-gen|atmosphere|netcode|physics-core|renderer-core|world-data|asset-pipeline|database|game-data|ui|shared|config)\/dist/],
      transformMixedEsModules: true,
    },
  },
});
