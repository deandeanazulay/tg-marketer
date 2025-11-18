import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    target: 'esnext'
  },
  server: {
    port: 3000,
    host: true
  },
  esbuild: {
    jsx: 'automatic'
  }
});