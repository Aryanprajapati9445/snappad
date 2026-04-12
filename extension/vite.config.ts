import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      // After build, copy popup HTML to dist root and fix relative paths
      name: 'copy-popup-html',
      closeBundle() {
        try {
          const src = resolve(__dirname, 'dist/src/popup/index.html');
          const dest = resolve(__dirname, 'dist/popup.html');
          // Fix relative paths: ../../assets -> ./assets
          let html = readFileSync(src, 'utf-8');
          html = html.replace(/\.\.\/\.\.\/assets\//g, './assets/');
          writeFileSync(dest, html);
        } catch {
          // ignore
        }
      },
    },
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background' || chunk.name === 'content') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        format: 'es',
      },
    },
  },
});
