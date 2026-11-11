import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { port: 5173, host: true },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    // fiche de clôture (E4) : la version livrée sans sourcemaps (7,5 Mo de moins), Three.js dans son propre fichier
    // (mis en cache à part du code du jeu) ; les décors ne changent pas
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (/[\\/]node_modules[\\/]three[\\/]/.test(id) ? 'three' : undefined),
      },
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
