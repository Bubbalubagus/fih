import { defineConfig } from 'vite';

// A dedicated port so the game doesn't collide with other local dev servers.
export default defineConfig({
  server: { port: 4747, strictPort: true, open: true },
  preview: { port: 4748, strictPort: true },
  test: { testTimeout: 60000 },
});
