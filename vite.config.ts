import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { port: 5173, host: true },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
