import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'assets/react',
    emptyOutDir: true,
    rollupOptions: {
      input: 'frontend/main.jsx',
      output: {
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
        chunkFileNames: 'chunk-[hash].js',
      },
    },
  },
});
